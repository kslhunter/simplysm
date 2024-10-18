import * as path from "path";
import { JsonConvert, StringUtil } from "@simplysm/sd-core-common";
import { File } from "@awesome-cordova-plugins/file";
// TODO: Storage 와 AutoUpdate의 패키지 분리
export class CordovaAppStorage {
    #rootDirectoryUrl;
    constructor(rootDirectory) {
        this.#rootDirectoryUrl = rootDirectory ?? File.applicationStorageDirectory;
    }
    async readJsonAsync(filePath) {
        const fileStr = await this.readFileAsync(filePath);
        return StringUtil.isNullOrEmpty(fileStr) ? undefined : JsonConvert.parse(fileStr);
    }
    async readFileBufferAsync(filePath) {
        const fullUrl = this.getFullUrl(filePath);
        const dirUrl = path.dirname(fullUrl);
        const fileName = path.basename(fullUrl);
        return Buffer.from(await File.readAsArrayBuffer(dirUrl, fileName));
    }
    async readFileAsync(filePath) {
        const fullUrl = this.getFullUrl(filePath);
        const dirUrl = path.dirname(fullUrl);
        const fileName = path.basename(fullUrl);
        return await File.readAsText(dirUrl, fileName);
    }
    async writeJsonAsync(filePath, data) {
        await this.writeAsync(filePath, JsonConvert.stringify(data));
    }
    async writeAsync(filePath, data) {
        const fullUrl = this.getFullUrl(filePath);
        const dirUrl = path.dirname(fullUrl);
        const fileName = path.basename(fullUrl);
        await this.#mkdirsAsync(path.dirname(filePath));
        await File.writeFile(dirUrl, fileName, data, { replace: true });
    }
    async readdirAsync(dirPath) {
        const fullUrl = this.getFullUrl(dirPath);
        const dirUrl = path.dirname(fullUrl);
        const dirName = path.basename(fullUrl);
        const entries = await File.listDir(dirUrl, dirName);
        return entries.map((item) => item.name);
    }
    async removeAsync(dirOrFilePath) {
        const fullUrl = this.getFullUrl(dirOrFilePath);
        const dirUrl = path.dirname(fullUrl);
        const dirOrFileName = path.basename(fullUrl);
        const list = await File.listDir(path.dirname(dirUrl), path.basename(dirUrl));
        const single = list.single((item) => item.name === dirOrFileName);
        if (!single)
            return;
        if (single.isDirectory) {
            await File.removeDir(dirUrl, dirOrFileName);
        }
        else {
            await File.removeFile(dirUrl, dirOrFileName);
        }
    }
    getFullUrl(targetPath) {
        return path.join(this.#rootDirectoryUrl, targetPath);
    }
    async #mkdirAsync(dirPath) {
        const fullUrl = this.getFullUrl(dirPath);
        const dirUrl = path.dirname(fullUrl);
        const dirName = path.basename(fullUrl);
        await File.createDir(dirUrl, dirName, false);
    }
    async #mkdirsAsync(dirPath) {
        const dirs = dirPath.replace(/^\//, "").replace(/\/$/, "").split("/");
        let currDir = "";
        for (const dir of dirs) {
            currDir += dir;
            await this.#mkdirAsync(currDir);
            currDir += "/";
        }
    }
}
//# sourceMappingURL=CordovaAppStorage.js.map