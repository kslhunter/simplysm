import {IStorage} from "../common/IStorage";
import {IFtpConnectionConfig} from "./IFtpConnectionConfig";
import * as fs from "fs";
import {CodeException, Logger} from "@simplism/core";

//tslint:disable-next-line:variable-name
const JSFtp = require("jsftp");

export class FtpStorage implements IStorage {
    private _logger = Logger.getLogger(this);
    private _ftp: any;

    async connect(connectionConfig: IFtpConnectionConfig): Promise<void> {
        this._ftp = new JSFtp({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.user,
            pass: connectionConfig.password
        });

        await new Promise((resolve, reject) => {
            this._ftp.raw("OPTS UTF8 ON", (err: Error) => {
                if (err) {
                    reject(new CodeException(err["code"], err.message));
                    return;
                }
                resolve();
            });
        });
    }

    async mkdir(storageDirPath: string): Promise<void> {
        await new Promise((resolve, reject) => {
            this._ftp.raw("MKD", storageDirPath, (err: Error) => {
                if (err && err["code"] !== 550) {
                    reject(new CodeException(err["code"], err.message));
                    return;
                }
                resolve();
            });
        });
    }

    async put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
        let buffer: Buffer;
        if (typeof localPathOrBuffer === "string") {
            buffer = fs.readFileSync(localPathOrBuffer);
        }
        else {
            buffer = localPathOrBuffer;
        }

        await new Promise((resolve, reject) => {
            this._ftp.put(buffer, storageFilePath, (err: Error) => {
                if (err) {
                    if (err["code"] === 550) {
                        this._logger.warn(storageFilePath + ": " + err.message);
                    } else {
                        reject(new CodeException(err["code"], err.message));
                        return;
                    }
                }
                resolve();
            });
        });
    }

    async close(): Promise<void> {
        await new Promise((resolve, reject) => {
            this._ftp.raw("quit", (err: Error) => {
                if (err) {
                    reject(new CodeException(err["code"], err.message));
                    return;
                }
                resolve();
            });
        });
    }
}
