import https from "https";
import { FsUtil, SdProcess } from "@simplysm/sd-core-node";
import mime from "mime";

export class SdCliGithubApi {
  public constructor(private readonly _apiKey: string,
                     private readonly _repoOwner: string,
                     private readonly _repoName: string) {
  }

  public async uploadAsync(version: string, files: { from: string; to: string }[]): Promise<void> {
    const uploadUrl = await this._createReleaseTagAsync(version);

    for (const file of files) {
      await this._uploadFileAsync(file.from, `${uploadUrl}?name=${file.to}`);
    }
  }

  private async _uploadFileAsync(fromPath: string, toUrl: string): Promise<void> {
    const fileBuffer = await FsUtil.readFileBufferAsync(fromPath);
    const contentLength = fileBuffer.length;

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        toUrl,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${this._apiKey}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "@simplysm/sd-cli:publish",
            "Content-Length": contentLength,
            "Content-Type": mime.getType(toUrl)!
          }
        },
        (res) => {
          let dataBuffer = Buffer.from([]);
          res.on("data", data => {
            dataBuffer = Buffer.concat([dataBuffer, data]);
          });

          res.on("end", () => {
            if (res.statusCode !== 200) {
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
      req.write(fileBuffer);
      req.end();
    });
  }

  private async _createReleaseTagAsync(ver: string): Promise<string> {
    const currentBranch = (await SdProcess.spawnAsync("git branch --show-current")).trim();

    return await new Promise<string>((resolve, reject) => {
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
              resolve(resData.upload_url.replace(/\{.*}$/g, ""));
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
        draft: true,
        prerelease: false
      }));

      req.end();
    });
  }
}