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
      console.log(`https://api.github.com/repos/${this._repoOwner}/${this._repoName.slice(1)}/releases`);
      console.log(this._apiKey);

      const req = https.request(
        `https://api.github.com/repos/${this._repoOwner}/${this._repoName}/releases`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${this._apiKey}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "@simplysm/sd-cli/" + this.constructor.name
          }
        },
        (res) => {
          res.on("data", data => {
            if (res.statusCode !== 201) {
              throw new Error(data.toString());
            }
            else{
              console.log(JSON.parse(data.toString()));
              resolve();
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
}