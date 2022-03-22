import https from "https";
import { SdProcess } from "@simplysm/sd-core-node";

export class SdCliGithubApi {
  public constructor(private readonly _apiKey: string,
                     private readonly _repoOwner: string,
                     private readonly _repoName: string) {
  }

  public async uploadAsync(version: string, from: string, to: string): Promise<void> {
    await this._createReleaseTagAsync(version);
  }

  private async _createReleaseTagAsync(ver: string): Promise<void> {
    const currentBranch = (await SdProcess.spawnAsync("git branch --show-current")).trim();

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        `https://api.github.com/repos/${this._repoOwner}/${this._repoName}/releases`,
        {
          method: "POST",
          headers: {
            access_token: this._apiKey
          }
        },
        (res) => {
          res.on("data", data => {
            console.log(data);
            resolve();
          });
        }
      );

      req.on("error", (error) => {
        reject(error);
      });

      req.write(JSON.stringify({
        target_commitish: currentBranch,
        draft: false,
        prerelease: false,
        tag_name: `v${ver}`,
        name: `v${ver}`,
        body: `v${ver}`,
      }));

      req.end();
    });
  }
}