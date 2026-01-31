import { WebPlugin } from "@capacitor/core";
import type { IFileInfo, IFileSystemPlugin, TStorage } from "../IFileSystemPlugin";
import { VirtualFileSystem } from "./VirtualFileSystem";
import path from "path";

export class FileSystemWeb extends WebPlugin implements IFileSystemPlugin {
  private readonly _fs = new VirtualFileSystem("capacitor_web_virtual_fs");

  async checkPermission(): Promise<{ granted: boolean }> {
    return await Promise.resolve({ granted: true });
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

  async getFileUri(options: { path: string }): Promise<{ uri: string }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      throw new Error("File not found: " + options.path);
    }
    const byteCharacters = atob(entry.dataBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)]);
    return { uri: URL.createObjectURL(blob) };
  }

  async writeFile(options: {
    path: string;
    data: string;
    encoding?: "utf8" | "base64";
  }): Promise<void> {
    await this._fs.ensureDir(path.dirname(options.path));
    const dataBase64 = options.encoding === "base64" ? options.data : btoa(options.data);
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
    const data = options.encoding === "base64" ? entry.dataBase64 : atob(entry.dataBase64);
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
