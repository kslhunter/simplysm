import https from "https";
import { SdProcess } from "@simplysm/sd-core-node";
import mime from "mime";

export class SdCliGithubApi {
  public constructor(private readonly _apiKey: string,
                     private readonly _repoOwner: string,
                     private readonly _repoName: string) {
  }

  public async uploadAsync(version: string, files: { name: string; buffer: Buffer }[]): Promise<void> {
    await this._pushAllAsync();

    const releaseId = await this._createReleaseTagAsync(version);

    for (const file of files) {
      await this._uploadFileAsync(releaseId, file.name, file.buffer);
    }
  }

  private async _uploadFileAsync(releaseId: number, fileName: string, buffer: Buffer): Promise<void> {
    const contentLength = buffer.length;

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        `https://uploads.github.com/repos/${this._repoOwner}/${this._repoName}/releases/${releaseId}/assets?name=${fileName}&label=${fileName}`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${this._apiKey}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "@simplysm/sd-cli:publish",
            "Content-Length": contentLength,
            "Content-Type": mime.getType(fileName)!
          }
        },
        (res) => {
          let dataBuffer = Buffer.from([]);
          res.on("data", data => {
            dataBuffer = Buffer.concat([dataBuffer, data]);
          });

          res.on("end", () => {
            if (res.statusCode !== 201) {
              const errObj = JSON.parse(dataBuffer.toString());
              throw new Error(errObj.message + "(" + errObj.documentation_url + ")");
            }
            else {
              resolve();
            }
          });
        }
      );

      req.on("error", (error) => {
        reject(error);
      });
      req.write(buffer);
      req.end();
    });
  }

  private async _createReleaseTagAsync(ver: string): Promise<number> {
    const currentBranch = (await SdProcess.spawnAsync("git branch --show-current")).trim();

    return await new Promise<number>((resolve, reject) => {
      const req = https.request(
        `https://api.github.com/repos/${this._repoOwner}/${this._repoName}/releases`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${this._apiKey}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "@simplysm/sd-cli:publish"
          }
        },
        (res) => {
          let dataBuffer = Buffer.from([]);
          res.on("data", data => {
            dataBuffer = Buffer.concat([dataBuffer, data]);
          });

          res.on("end", () => {
            if (res.statusCode !== 201) {
              const errObj = JSON.parse(dataBuffer.toString());
              throw new Error(errObj.message + "(" + errObj.documentation_url + ")");
            }
            else {
              // console.log(JSON.parse(dataBuffer.toString()));
              const resData = JSON.parse(dataBuffer.toString());
              resolve(resData.id);
            }
          });
        }
      );

      req.on("error", (error) => {
        reject(error);
      });

      req.write(JSON.stringify({
        tag_name: `v${ver}`,
        target_commitish: currentBranch,
        name: `v${ver}`,
        body: `v${ver}`,
        draft: false,
        prerelease: false
      }));

      req.end();
    });
  }

  private async _pushAllAsync(): Promise<void> {
    await SdProcess.spawnAsync("git push --tags", undefined, true);
  }
}