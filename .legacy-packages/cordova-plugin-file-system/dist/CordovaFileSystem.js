export class CordovaFileSystem {
    /**
     * 권한 확인
     */
    static async checkPermissionAsync() {
        const result = await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "checkPermission", []);
        });
        return result === "true";
    }
    // 권한 얻기
    static async requestPermissionAsync() {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "requestPermission", []);
        });
    }
    // 디렉토리 읽기
    static async readdirAsync(dirPath) {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "readdir", [dirPath]);
        });
    }
    // 저장소 경로 얻기
    static async getStoragePathAsync(type) {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "getStoragePath", [type]);
        });
    }
    // 파일 URI 얻기
    static async getFileUriAsync(filePath) {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "getFileUri", [filePath]);
        });
    }
    // 파일 쓰기
    static async writeFileAsync(filePath, data) {
        if (Buffer.isBuffer(data)) {
            await this._writeFileBufferAsync(filePath, data);
        }
        else {
            await this._writeFileStringAsync(filePath, data);
        }
    }
    static async _writeFileStringAsync(filePath, data) {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "writeFileString", [filePath, data]);
        });
    }
    static async _writeFileBufferAsync(filePath, data) {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "writeFileBase64", [
                filePath,
                data.toString("base64"),
            ]);
        });
    }
    /**
     * 파일 읽기 (UTF-8 문자열)
     * @param filePath 읽을 파일 경로
     * @returns 파일 내용 문자열
     * @throws 파일이 존재하지 않는 경우 FileNotFoundException 에러가 발생합니다.
     */
    static async readFileStringAsync(filePath) {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "readFileString", [filePath]);
        });
    }
    // 파일 읽기 (base64 → Buffer)
    static async readFileBufferAsync(filePath) {
        const base64 = await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "readFileBase64", [filePath]);
        });
        return Buffer.from(base64, "base64");
    }
    // 파일/디렉토리 삭제 (디렉토리 Recursive)
    static async removeAsync(targetPath) {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "remove", [targetPath]);
        });
    }
    // 디렉토리 생성 (Recursive)
    static async mkdirsAsync(targetPath) {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "mkdirs", [targetPath]);
        });
    }
    // 존재 여부 확인 (파일/디렉토리)
    static async existsAsync(targetPath) {
        const result = await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaFileSystem", "exists", [targetPath]);
        });
        return result === "true";
    }
}
//# sourceMappingURL=CordovaFileSystem.js.map