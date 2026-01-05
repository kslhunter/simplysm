export declare abstract class CordovaFileSystem {
    /**
     * 권한 확인
     */
    static checkPermissionAsync(): Promise<boolean>;
    static requestPermissionAsync(): Promise<void>;
    static readdirAsync(dirPath: string): Promise<{
        name: string;
        isDirectory: boolean;
    }[]>;
    static getStoragePathAsync(type: "external" | "externalFiles" | "externalCache" | "externalMedia" | "appData" | "appFiles" | "appCache"): Promise<string>;
    static getFileUriAsync(filePath: string): Promise<string>;
    static writeFileAsync(filePath: string, data: string | Buffer): Promise<void>;
    private static _writeFileStringAsync;
    private static _writeFileBufferAsync;
    /**
     * 파일 읽기 (UTF-8 문자열)
     * @param filePath 읽을 파일 경로
     * @returns 파일 내용 문자열
     * @throws 파일이 존재하지 않는 경우 FileNotFoundException 에러가 발생합니다.
     */
    static readFileStringAsync(filePath: string): Promise<string>;
    static readFileBufferAsync(filePath: string): Promise<Buffer>;
    static removeAsync(targetPath: string): Promise<void>;
    static mkdirsAsync(targetPath: string): Promise<void>;
    static existsAsync(targetPath: string): Promise<boolean>;
}
