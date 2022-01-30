import SFtpClient from "ssh2-sftp-client";
export class SdSFtpStorage {
    async connectAsync(connectionConfig) {
        this._sftp = new SFtpClient();
        await this._sftp.connect({
            host: connectionConfig.host,
            port: connectionConfig.port,
            username: connectionConfig.username,
            password: connectionConfig.password
        });
    }
    async mkdirAsync(storageDirPath) {
        await this._sftp.mkdir(storageDirPath, true);
    }
    async renameAsync(fromPath, toPath) {
        await this._sftp.rename(fromPath, toPath);
    }
    async putAsync(localPathOrBuffer, storageFilePath) {
        if (typeof localPathOrBuffer === "string") {
            await this._sftp.fastPut(localPathOrBuffer, storageFilePath);
        }
        else {
            await this._sftp.put(localPathOrBuffer, storageFilePath);
        }
    }
    async uploadDirAsync(fromPath, toPath) {
        await this._sftp.uploadDir(fromPath, toPath);
    }
    async closeAsync() {
        await this._sftp.end();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RTRnRwU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zdG9yYWdlcy9TZFNGdHBTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sVUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBRTFDLE1BQU0sT0FBTyxhQUFhO0lBR2pCLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQTRDO1FBQ3BFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUM5QixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJO1lBQzNCLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJO1lBQzNCLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRO1lBQ25DLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRO1NBQ3BDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQXNCO1FBQzVDLE1BQU0sSUFBSSxDQUFDLEtBQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUN2RCxNQUFNLElBQUksQ0FBQyxLQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBa0MsRUFBRSxlQUF1QjtRQUMvRSxJQUFJLE9BQU8saUJBQWlCLEtBQUssUUFBUSxFQUFFO1lBQ3pDLE1BQU0sSUFBSSxDQUFDLEtBQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7U0FDL0Q7YUFDSTtZQUNILE1BQU0sSUFBSSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7U0FDM0Q7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFnQixFQUFFLE1BQWM7UUFDMUQsTUFBTSxJQUFJLENBQUMsS0FBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxVQUFVO1FBQ3JCLE1BQU0sSUFBSSxDQUFDLEtBQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0YifQ==