export abstract class CordovaFileSystem {
  /**
   * 권한 확인
   */
  static async checkPermissionAsync(): Promise<boolean> {
    const result = await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "checkPermission", []);
    });
    return result === "true";
  }

  // 권한 얻기
  static async requestPermissionAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "requestPermission", []);
    });
  }

  // 디렉토리 읽기
  static async readdirAsync(dirPath: string): Promise<
    {
      name: string;
      isDirectory: boolean;
    }[]
  > {
    return await new Promise((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "readdir", [dirPath]);
    });
  }

  // 저장소 경로 얻기
  static async getStoragePathAsync(
    type:
      | "external"
      | "externalFiles"
      | "externalCache"
      | "externalMedia"
      | "appData"
      | "appFiles"
      | "appCache",
  ): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "getStoragePath", [type]);
    });
  }

  // 파일 URI 얻기
  static async getFileUriAsync(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "getFileUri", [filePath]);
    });
  }

  // 파일 쓰기
  static async writeFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    if (Buffer.isBuffer(data)) {
      await this._writeFileBufferAsync(filePath, data);
    } else {
      await this._writeFileStringAsync(filePath, data);
    }
  }

  private static async _writeFileStringAsync(filePath: string, data: string): Promise<void> {
    await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "writeFileString", [filePath, data]);
    });
  }

  private static async _writeFileBufferAsync(filePath: string, data: Buffer): Promise<void> {
    await new Promise<string>((resolve, reject) => {
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
  static async readFileStringAsync(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "readFileString", [filePath]);
    });
  }

  // 파일 읽기 (base64 → Buffer)
  static async readFileBufferAsync(filePath: string): Promise<Buffer> {
    const base64 = await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "readFileBase64", [filePath]);
    });
    return Buffer.from(base64, "base64");
  }

  // 파일/디렉토리 삭제 (디렉토리 Recursive)
  static async removeAsync(targetPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "remove", [targetPath]);
    });
  }

  // 디렉토리 생성 (Recursive)
  static async mkdirsAsync(targetPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "mkdirs", [targetPath]);
    });
  }

  // 존재 여부 확인 (파일/디렉토리)
  static async existsAsync(targetPath: string): Promise<boolean> {
    const result = await new Promise<string>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "exists", [targetPath]);
    });
    return result === "true";
  }
}
