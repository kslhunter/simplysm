// src/browser/CordovaFileSystemProxy.ts

// @ts-expect-error: cordova runtime 모듈
import { add as addProxy } from "cordova/exec/proxy";
import path from "node:path";

type SuccessCallback = (value?: any) => void;
type ErrorCallback = (err?: any) => void;

type FsEntry = { path: string; kind: "file"; dataBase64: string } | { path: string; kind: "dir" };

const DB_NAME = "cordova_fs_browser";
const STORE_NAME = "entries";
const DB_VERSION = 1;

// --------- IndexedDB 헬퍼 ---------

async function openDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "path" });
        store.createIndex("path", "path", { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const db = await openDb();

  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function getEntry(filePath: string): Promise<FsEntry | undefined> {
  return withStore("readonly", (store) => {
    return new Promise<FsEntry | undefined>((resolve, reject) => {
      const req = store.get(filePath);
      req.onsuccess = () => resolve(req.result as FsEntry | undefined);
      req.onerror = () => reject(req.error);
    });
  });
}

function putEntry(entry: FsEntry): Promise<void> {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function deleteByPrefix(pathPrefix: string): Promise<boolean> {
  return withStore("readwrite", (store) => {
    return new Promise<boolean>((resolve, reject) => {
      const req = store.openCursor();
      let found = false;
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(found);
          return;
        }
        const key = String(cursor.key);
        if (key === pathPrefix || key.startsWith(pathPrefix + "/")) {
          found = true;
          cursor.delete();
          cursor.continue();
        } else {
          cursor.continue();
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

function listChildren(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
  const prefix = dirPath === "/" ? "/" : dirPath + "/";

  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.openCursor();
      const map = new Map<string, boolean>();

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(
            Array.from(map.entries()).map(([name, isDirectory]) => ({
              name,
              isDirectory,
            })),
          );
          return;
        }
        const key = String(cursor.key);
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          if (rest) {
            const firstSeg = rest.split("/")[0];
            if (firstSeg) {
              if (!map.has(firstSeg)) {
                const value = cursor.value as FsEntry;
                map.set(firstSeg, value.kind === "dir");
              }
            }
          }
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  });
}

async function ensureDir(dirPath: string): Promise<void> {
  if (dirPath === "/") {
    await putEntry({ path: "/", kind: "dir" });
    return;
  }

  const segments = dirPath.split("/").filter(Boolean);
  let acc = "";
  for (const seg of segments) {
    acc += "/" + seg;
    const existing = await getEntry(acc);
    if (!existing) {
      await putEntry({ path: acc, kind: "dir" });
    } else if (existing.kind !== "dir") {
      // 파일이면 그냥 두고 넘어감 (디렉터리로 강제 변환 X)
    }
  }
}

// --------- 실제 Proxy 구현 ---------

const CordovaFileSystemProxy = {
  checkPermission(success: SuccessCallback, _error: ErrorCallback, _args: any[]) {
    // 브라우저에서는 퍼미션 없음 → 항상 true
    success("true");
  },

  requestPermission(success: SuccessCallback, _error: ErrorCallback, _args: any[]) {
    success();
  },

  async readdir(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const dirPath = String(args[0] ?? "");
      const entry = await getEntry(dirPath);
      if (!entry || entry.kind !== "dir") {
        error("Directory does not exist or is not a directory.");
        return;
      }
      const children = await listChildren(dirPath);
      success(children);
    } catch (e: any) {
      error(`readdir failed: ${e?.message ?? e}`);
    }
  },

  async getStoragePath(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const type = String(args[0] ?? "");
      const base = "/browserfs";

      let storagePath: string;
      switch (type) {
        case "external":
          storagePath = base + "/external";
          break;
        case "externalFiles":
          storagePath = base + "/externalFiles";
          break;
        case "externalCache":
          storagePath = base + "/externalCache";
          break;
        case "externalMedia":
          storagePath = base + "/externalMedia";
          break;
        case "appData":
          storagePath = base + "/appData";
          break;
        case "appFiles":
          storagePath = base + "/appFiles";
          break;
        case "appCache":
          storagePath = base + "/appCache";
          break;
        default:
          error("Unknown storage type: " + type);
          return;
      }

      await ensureDir(storagePath);
      success(storagePath);
    } catch (e: any) {
      error(`getStoragePath failed: ${e?.message ?? e}`);
    }
  },

  async getFileUri(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const fullPath = String(args[0] ?? "");
      const entry = await getEntry(fullPath);

      if (!entry || entry.kind !== "file") {
        error("File not found: " + fullPath);
        return;
      }

      const byteCharacters = atob(entry.dataBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);

      success(url); // 안드로이드의 content:// 대신 blob: URL
    } catch (e: any) {
      error(`getFileUri failed: ${e?.message ?? e}`);
    }
  },

  async writeFileString(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const filePath = String(args[0] ?? "");
      const content = String(args[1] ?? "");

      await ensureDir(path.dirname(filePath));
      await putEntry({
        path: filePath,
        kind: "file",
        dataBase64: Buffer.from(content).toString("base64"),
      });

      success("String written successfully");
    } catch (e: any) {
      error(`writeFileString failed: ${e?.message ?? e}`);
    }
  },

  async writeFileBase64(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const filePath = String(args[0] ?? "");
      const base64Data = String(args[1] ?? "");

      await ensureDir(path.dirname(filePath));
      await putEntry({ path: filePath, kind: "file", dataBase64: base64Data });

      success("Binary file written successfully");
    } catch (e: any) {
      error(`writeFileBase64 failed: ${e?.message ?? e}`);
    }
  },

  async readFileString(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const filePath = String(args[0] ?? "");
      const entry = await getEntry(filePath);

      if (!entry || entry.kind !== "file") {
        error("File not found: " + filePath);
        return;
      }

      success(Buffer.from(entry.dataBase64, "base64").toString());
    } catch (e: any) {
      error(`readFileString failed: ${e?.message ?? e}`);
    }
  },

  async readFileBase64(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const filePath = String(args[0] ?? "");
      const entry = await getEntry(filePath);

      if (!entry || entry.kind !== "file") {
        error("File not found: " + filePath);
        return;
      }

      success(entry.dataBase64);
    } catch (e: any) {
      error(`readFileBase64 failed: ${e?.message ?? e}`);
    }
  },

  async remove(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const filePath = String(args[0] ?? "");
      const ok = await deleteByPrefix(filePath);
      if (!ok) {
        error("Deletion failed");
        return;
      }
      success("Deleted successfully");
    } catch (e: any) {
      error(`remove failed: ${e?.message ?? e}`);
    }
  },

  async mkdirs(success: SuccessCallback, error: ErrorCallback, args: any[]) {
    try {
      const dirPath = String(args[0] ?? "");
      const existing = await getEntry(dirPath);
      if (existing && existing.kind === "dir") {
        success("Already exists");
        return;
      }
      await ensureDir(dirPath);
      success("Directory created");
    } catch (e: any) {
      error(`mkdirs failed: ${e?.message ?? e}`);
    }
  },

  async exists(success: SuccessCallback, _error: ErrorCallback, args: any[]) {
    const filePath = String(args[0] ?? "");
    const entry = await getEntry(filePath);
    success(entry ? "true" : "false");
  },
};

// plugin.xml / JS 서비스 이름과 맞추기
addProxy("CordovaFileSystem", CordovaFileSystemProxy);

export default CordovaFileSystemProxy;
