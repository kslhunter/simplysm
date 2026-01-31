import { WebPlugin } from "@capacitor/core";
import { VirtualFileSystem } from "./VirtualFileSystem";
import path from "path";
export class FileSystemWeb extends WebPlugin {
    _fs = new VirtualFileSystem("capacitor_web_virtual_fs");
    async checkPermission() {
        return await Promise.resolve({ granted: true });
    }
    async requestPermission() { }
    async readdir(options) {
        const entry = await this._fs.getEntry(options.path);
        if (!entry || entry.kind !== "dir") {
            throw new Error("Directory does not exist");
        }
        const files = await this._fs.listChildren(options.path);
        return { files };
    }
    async getStoragePath(options) {
        const base = "/webfs";
        let storagePath;
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
    async getFileUri(options) {
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
    async writeFile(options) {
        await this._fs.ensureDir(path.dirname(options.path));
        const dataBase64 = options.encoding === "base64" ? options.data : btoa(options.data);
        await this._fs.putEntry({ path: options.path, kind: "file", dataBase64 });
    }
    async readFile(options) {
        const entry = await this._fs.getEntry(options.path);
        if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
            throw new Error("File not found: " + options.path);
        }
        const data = options.encoding === "base64" ? entry.dataBase64 : atob(entry.dataBase64);
        return { data };
    }
    async remove(options) {
        const ok = await this._fs.deleteByPrefix(options.path);
        if (!ok) {
            throw new Error("Deletion failed");
        }
    }
    async mkdir(options) {
        await this._fs.ensureDir(options.path);
    }
    async exists(options) {
        const entry = await this._fs.getEntry(options.path);
        return { exists: !!entry };
    }
}
//# sourceMappingURL=FileSystemWeb.js.map