const execProxy = require("cordova/exec/proxy");
const DB_NAME = "cordova_fs_browser";
const STORE_NAME = "entries";
const DB_VERSION = 1;
function dirname(path) {
  if (path === "/") return "/";
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return "/";
  return path.slice(0, idx);
}
// --------- IndexedDB 헬퍼 ---------
async function openDb() {
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
async function withStore(mode, fn) {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}
function getEntry(filePath) {
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(filePath);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}
function putEntry(entry) {
  return withStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}
function deleteByPrefix(pathPrefix) {
  return withStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
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
function listChildren(dirPath) {
  const prefix = dirPath === "/" ? "/" : dirPath + "/";
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.openCursor();
      const map = new Map();
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
                const value = cursor.value;
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
async function ensureDir(dirPath) {
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
  checkPermission(success) {
    // 브라우저에서는 퍼미션 없음 → 항상 true
    success("true");
  },
  requestPermission(success) {
    success();
  },
  async readdir(success, error, args) {
    try {
      const dirPath = String(args[0] ?? "");
      const entry = await getEntry(dirPath);
      if (!entry || entry.kind !== "dir") {
        error("Directory does not exist or is not a directory.");
        return;
      }
      const children = await listChildren(dirPath);
      success(children);
    } catch (e) {
      error(`readdir failed: ${e?.message ?? e}`);
    }
  },
  async getStoragePath(success, error, args) {
    try {
      const type = String(args[0] ?? "");
      const base = "/browserfs";
      let storagePath;
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
    } catch (e) {
      error(`getStoragePath failed: ${e?.message ?? e}`);
    }
  },
  async getFileUri(success, error, args) {
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
    } catch (e) {
      error(`getFileUri failed: ${e?.message ?? e}`);
    }
  },
  async writeFileString(success, error, args) {
    try {
      const filePath = String(args[0] ?? "");
      const content = String(args[1] ?? "");
      await ensureDir(dirname(filePath));
      await putEntry({
        path: filePath,
        kind: "file",
        dataBase64: btoa(content),
      });
      success("String written successfully");
    } catch (e) {
      error(`writeFileString failed: ${e?.message ?? e}`);
    }
  },
  async writeFileBase64(success, error, args) {
    try {
      const filePath = String(args[0] ?? "");
      const base64Data = String(args[1] ?? "");
      await ensureDir(dirname(filePath));
      await putEntry({ path: filePath, kind: "file", dataBase64: base64Data });
      success("Binary file written successfully");
    } catch (e) {
      error(`writeFileBase64 failed: ${e?.message ?? e}`);
    }
  },
  async readFileString(success, error, args) {
    try {
      const filePath = String(args[0] ?? "");
      const entry = await getEntry(filePath);
      if (!entry || entry.kind !== "file") {
        error("File not found: " + filePath);
        return;
      }
      success(atob(entry.dataBase64));
    } catch (e) {
      error(`readFileString failed: ${e?.message ?? e}`);
    }
  },
  async readFileBase64(success, error, args) {
    try {
      const filePath = String(args[0] ?? "");
      const entry = await getEntry(filePath);
      if (!entry || entry.kind !== "file") {
        error("File not found: " + filePath);
        return;
      }
      success(entry.dataBase64);
    } catch (e) {
      error(`readFileBase64 failed: ${e?.message ?? e}`);
    }
  },
  async remove(success, error, args) {
    try {
      const filePath = String(args[0] ?? "");
      const ok = await deleteByPrefix(filePath);
      if (!ok) {
        error("Deletion failed");
        return;
      }
      success("Deleted successfully");
    } catch (e) {
      error(`remove failed: ${e?.message ?? e}`);
    }
  },
  async mkdirs(success, error, args) {
    try {
      const dirPath = String(args[0] ?? "");
      const existing = await getEntry(dirPath);
      if (existing && existing.kind === "dir") {
        success("Already exists");
        return;
      }
      await ensureDir(dirPath);
      success("Directory created");
    } catch (e) {
      error(`mkdirs failed: ${e?.message ?? e}`);
    }
  },
  async exists(success, _error, args) {
    const filePath = String(args[0] ?? "");
    const entry = await getEntry(filePath);
    success(entry ? "true" : "false");
  },
};
// plugin.xml / JS 서비스 이름과 맞추기
execProxy.add("CordovaFileSystem", CordovaFileSystemProxy);
module.exports = CordovaFileSystemProxy;
