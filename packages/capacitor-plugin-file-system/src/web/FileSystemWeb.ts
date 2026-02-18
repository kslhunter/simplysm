import { WebPlugin } from "@capacitor/core";
import type { IFileInfo, IFileSystemPlugin, TStorage } from "../IFileSystemPlugin";
import { VirtualFileSystem } from "./VirtualFileSystem";
import { bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

export class FileSystemWeb extends WebPlugin implements IFileSystemPlugin {
  private readonly _fs = new VirtualFileSystem("capacitor_web_virtual_fs");
  private readonly _textEncoder = new TextEncoder();
  private readonly _textDecoder = new TextDecoder();

  async hasPermission(): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async requestPermission(): Promise<void> {}

  async readdir(options: { path: string }): Promise<{ files: IFileInfo[] }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "dir") {
      throw new Error("Directory does not exist");
    }
    const files = await this._fs.listChildren(options.path);
    return { files };
  }

  async getStoragePath(options: { type: TStorage }): Promise<{ path: string }> {
    const base = "/webfs";
    let storagePath: string;
    switch (options.type) {
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
        throw new Error("Unknown storage type: " + options.type);
    }
    await this._fs.ensureDir(storagePath);
    return { path: storagePath };
  }

  /**
   * 파일의 Blob URL을 반환합니다.
   * @warning 반환된 URI는 사용 후 반드시 `URL.revokeObjectURL(uri)`를 호출하여 해제해야 합니다.
   * 해제하지 않으면 메모리 누수가 발생할 수 있습니다.
   */
  async getFileUri(options: { path: string }): Promise<{ uri: string }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      throw new Error("File not found: " + options.path);
    }
    const bytes = bytesFromBase64(entry.dataBase64);
    const blob = new Blob([bytes as BlobPart]);
    return { uri: URL.createObjectURL(blob) };
  }

  async writeFile(options: {
    path: string;
    data: string;
    encoding?: "utf8" | "base64";
  }): Promise<void> {
    const idx = options.path.lastIndexOf("/");
    const dir = idx === -1 ? "." : options.path.substring(0, idx) || "/";
    await this._fs.ensureDir(dir);
    const dataBase64 =
      options.encoding === "base64"
        ? options.data
        : bytesToBase64(this._textEncoder.encode(options.data));
    await this._fs.putEntry({ path: options.path, kind: "file", dataBase64 });
  }

  async readFile(options: {
    path: string;
    encoding?: "utf8" | "base64";
  }): Promise<{ data: string }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      throw new Error("File not found: " + options.path);
    }
    const data =
      options.encoding === "base64"
        ? entry.dataBase64
        : this._textDecoder.decode(bytesFromBase64(entry.dataBase64));
    return { data };
  }

  async remove(options: { path: string }): Promise<void> {
    const ok = await this._fs.deleteByPrefix(options.path);
    if (!ok) {
      throw new Error("Deletion failed");
    }
  }

  async mkdir(options: { path: string }): Promise<void> {
    await this._fs.ensureDir(options.path);
  }

  async exists(options: { path: string }): Promise<{ exists: boolean }> {
    const entry = await this._fs.getEntry(options.path);
    return { exists: !!entry };
  }
}
