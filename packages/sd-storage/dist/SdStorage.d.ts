import { ISdStorage, ISdStorageConnectionConfig } from "./commons";
export declare class SdStorage {
    static connectAsync(type: "sftp" | "ftp" | "ftps", conf: ISdStorageConnectionConfig): Promise<ISdStorage>;
}
