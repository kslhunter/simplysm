import * as path from "path";
import glob from "glob";
import * as os from "os";
import * as fs from "fs";
import { JsonConvert, SdError } from "@simplysm/sd-core-common";
import * as crypto from "crypto";
export class FsUtil {
    static getParentPaths(currentPath) {
        const result = [];
        let curr = currentPath;
        while (curr !== path.resolve(curr, "..")) {
            curr = path.resolve(curr, "..");
            result.push(curr);
        }
        return result;
    }
    static async getMd5Async(filePath) {
        return await new Promise((resolve, reject) => {
            const hash = crypto.createHash("md5").setEncoding("hex");
            fs.createReadStream(filePath)
                .on("error", (err) => {
                reject(new SdError(err, filePath));
            })
                .pipe(hash)
                .once("finish", () => {
                resolve(hash.read());
            });
        });
    }
    static async globAsync(pattern, options) {
        return await new Promise((resolve, reject) => {
            glob(pattern, options ?? {}, (err, matches) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(matches.map((item) => path.resolve(item)));
            });
        });
    }
    static glob(pattern, options) {
        return glob.sync(pattern, options);
    }
    static async readdirAsync(targetPath) {
        try {
            return await fs.promises.readdir(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static readdir(targetPath) {
        try {
            return fs.readdirSync(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static exists(targetPath) {
        try {
            return fs.existsSync(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async removeAsync(targetPath) {
        try {
            await fs.promises.rm(targetPath, { recursive: true, force: true, retryDelay: 500, maxRetries: 6 });
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static remove(targetPath) {
        try {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async copyAsync(sourcePath, targetPath, filter) {
        if (!FsUtil.exists(sourcePath)) {
            return;
        }
        let lstat;
        try {
            lstat = await fs.promises.lstat(sourcePath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
        if (lstat.isDirectory()) {
            await FsUtil.mkdirsAsync(targetPath);
            const children = await FsUtil.globAsync(path.resolve(sourcePath, "*"));
            await children.parallelAsync(async (childPath) => {
                if (filter && !filter(childPath)) {
                    return;
                }
                const relativeChildPath = path.relative(sourcePath, childPath);
                const childTargetPath = path.resolve(targetPath, relativeChildPath);
                await FsUtil.copyAsync(childPath, childTargetPath);
            });
        }
        else {
            await FsUtil.mkdirsAsync(path.resolve(targetPath, ".."));
            try {
                await fs.promises.copyFile(sourcePath, targetPath);
            }
            catch (err) {
                if (err instanceof Error) {
                    throw new SdError(err, targetPath);
                }
                else {
                    throw err;
                }
            }
        }
    }
    static copy(sourcePath, targetPath, filter) {
        if (!FsUtil.exists(sourcePath)) {
            return;
        }
        let lstat;
        try {
            lstat = fs.lstatSync(sourcePath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
        if (lstat.isDirectory()) {
            FsUtil.mkdirs(targetPath);
            const children = FsUtil.glob(path.resolve(sourcePath, "*"));
            for (const childPath of children) {
                if (filter && !filter(childPath)) {
                    return;
                }
                const relativeChildPath = path.relative(sourcePath, childPath);
                const childTargetPath = path.resolve(targetPath, relativeChildPath);
                FsUtil.copy(childPath, childTargetPath);
            }
        }
        else {
            FsUtil.mkdirs(path.resolve(targetPath, ".."));
            try {
                fs.copyFileSync(sourcePath, targetPath);
            }
            catch (err) {
                if (err instanceof Error) {
                    throw new SdError(err, targetPath);
                }
                else {
                    throw err;
                }
            }
        }
    }
    static async mkdirsAsync(targetPath) {
        if (FsUtil.exists(targetPath))
            return;
        try {
            await fs.promises.mkdir(targetPath, { recursive: true });
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static mkdirs(targetPath) {
        try {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async writeJsonAsync(targetPath, data, options) {
        const json = JsonConvert.stringify(data, options);
        await FsUtil.writeFileAsync(targetPath, json);
    }
    static async writeFileAsync(targetPath, data) {
        await FsUtil.mkdirsAsync(path.dirname(targetPath));
        try {
            await fs.promises.writeFile(targetPath, data);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath + (typeof data === "object" ? data.constructor?.name ?? "object" : typeof data));
            }
            else {
                throw err;
            }
        }
    }
    static writeFile(targetPath, data) {
        FsUtil.mkdirs(path.resolve(targetPath, ".."));
        try {
            if (typeof data === "string") {
                fs.writeFileSync(targetPath, data);
            }
            else {
                fs.writeFileSync(targetPath, data);
            }
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static readFile(targetPath) {
        try {
            return fs.readFileSync(targetPath, "utf-8");
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async readFileAsync(targetPath) {
        if (!FsUtil.exists(targetPath)) {
            throw new SdError(targetPath + "파일을 찾을 수 없습니다.");
        }
        try {
            return await fs.promises.readFile(targetPath, "utf-8");
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static readFileBuffer(targetPath) {
        try {
            return fs.readFileSync(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async readFileBufferAsync(targetPath) {
        try {
            return await fs.promises.readFile(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static readJson(targetPath) {
        const contents = FsUtil.readFile(targetPath);
        return JsonConvert.parse(contents);
    }
    static async readJsonAsync(targetPath) {
        const contents = await FsUtil.readFileAsync(targetPath);
        try {
            return JsonConvert.parse(contents);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath + os.EOL + contents);
            }
            else {
                throw err;
            }
        }
    }
    static lstat(targetPath) {
        try {
            return fs.lstatSync(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async lstatAsync(targetPath) {
        try {
            return await fs.promises.lstat(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static appendFile(targetPath, data) {
        try {
            fs.appendFileSync(targetPath, data, "utf8");
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static open(targetPath, flags) {
        try {
            return fs.openSync(targetPath, flags);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async openAsync(targetPath, flags) {
        try {
            return await fs.promises.open(targetPath, flags);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static createReadStream(sourcePath) {
        try {
            return fs.createReadStream(sourcePath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, sourcePath);
            }
            else {
                throw err;
            }
        }
    }
    static createWriteStream(targetPath) {
        try {
            return fs.createWriteStream(targetPath);
        }
        catch (err) {
            if (err instanceof Error) {
                throw new SdError(err, targetPath);
            }
            else {
                throw err;
            }
        }
    }
    static async isDirectoryAsync(targetPath) {
        return (await FsUtil.lstatAsync(targetPath)).isDirectory();
    }
    static isDirectory(targetPath) {
        return FsUtil.lstat(targetPath).isDirectory();
    }
    static async clearEmptyDirectoryAsync(dirPath) {
        if (!FsUtil.exists(dirPath))
            return;
        const childNames = await FsUtil.readdirAsync(dirPath);
        for (const childName of childNames) {
            const childPath = path.resolve(dirPath, childName);
            if (await FsUtil.isDirectoryAsync(childPath)) {
                await this.clearEmptyDirectoryAsync(childPath);
            }
        }
        if ((await FsUtil.readdirAsync(dirPath)).length === 0) {
            await FsUtil.removeAsync(dirPath);
        }
    }
    static findAllParentChildPaths(childName, fromPath, rootPath) {
        const resultPaths = [];
        let current = fromPath;
        while (current) {
            const potential = path.resolve(current, childName);
            if (FsUtil.exists(potential) && FsUtil.isDirectory(potential)) {
                resultPaths.push(potential);
            }
            if (current === rootPath)
                break;
            const next = path.dirname(current);
            if (next === current)
                break;
            current = next;
        }
        return resultPaths;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnNVdGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL0ZzVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUVqQyxNQUFNLE9BQU8sTUFBTTtJQUNWLE1BQU0sQ0FBQyxjQUFjLENBQUMsV0FBbUI7UUFDOUMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQztRQUN2QixPQUFPLElBQUksS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN4QyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNuQjtRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFnQjtRQUM5QyxPQUFPLE1BQU0sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDbkQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztpQkFDMUIsRUFBRSxDQUFDLE9BQU8s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