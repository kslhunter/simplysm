import * as ftp from "basic-ftp";
import { Readable } from "stream";
export class SdFtpStorage {
    constructor(_secure) {
        this._secure = _secure;
    }
    async connectAsync(connectionConfig) {
        this._ftp = new ftp.Client();
        await this._ftp.access({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password,
            secure: this._secure
        });
    }
    async mkdirAsync(storageDirPath) {
        if (this._ftp === undefined) {
            throw new Error("FTP 서버에 연결되어있지 않습니다.");
        }
        await this._ftp.ensureDir(storageDirPath);
    }
    async renameAsync(fromPath, toPath) {
        if (this._ftp === undefined) {
            throw new Error("FTP 서버에 연결되어있지 않습니다.");
        }
        await this._ftp.rename(fromPath, toPath);
    }
    async putAsync(localPathOrBuffer, storageFilePath) {
        if (this._ftp === undefined) {
            throw new Error("FTP 서버에 연결되어있지 않습니다.");
        }
        let param;
        if (typeof localPathOrBuffer === "string") {
            param = localPathOrBuffer;
        }
        else {
            param = new Readable();
            param.push(localPathOrBuffer);
            param.push(null);
        }
        await this._ftp.uploadFrom(param, storageFilePath);
    }
    async uploadDirAsync(fromPath, toPath) {
        if (this._ftp === undefined) {
            throw new Error("FTP 서버에 연결되어있지 않습니다.");
        }
        await this._ftp.uploadFromDir(fromPath, toPath);
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async closeAsync() {
        if (this._ftp === undefined) {
            throw new Error("FTP 서버에 연결되어있지 않습니다.");
        }
        this._ftp.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RGdHBTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2VzL1NkRnRwU3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLFdBQVcsQ0FBQztBQUVqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRWxDLE1BQU0sT0FBTyxZQUFZO0lBR3ZCLFlBQW9DLE9BQWdCO1FBQWhCLFlBQU8sR0FBUCxPQUFPLENBQVM7SUFDcEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQTRDO1FBQ3BFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDN0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTtZQUMzQixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTtZQUMzQixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsUUFBUTtZQUMvQixRQUFRLEVBQUUsZ0JBQWdCLENBQUMsUUFBUTtZQUNuQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDckIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBc0I7UUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7UUFDRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUN2RCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUN6QztRQUNELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFTSxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFrQyxFQUFFLGVBQXVCO1FBQy9FLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsSUFBSSxLQUF3QixDQUFDO1FBQzdCLElBQUksT0FBTyxpQkFBaUIsS0FBSyxRQUFRLEVBQUU7WUFDekMsS0FBSyxHQUFHLGlCQUFpQixDQUFDO1NBQzNCO2FBQ0k7WUFDSCxLQUFLLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUN2QixLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQjtRQUVELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUMxRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUN6QztRQUNELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCw0REFBNEQ7SUFDckQsS0FBSyxDQUFDLFVBQVU7UUFDckIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BCLENBQUM7Q0FDRiJ9