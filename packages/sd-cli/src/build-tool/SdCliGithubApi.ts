import https from "https";

export class SdCliGithubApi {
  public constructor(private readonly _apiKey: string,
                     private readonly _repoOwner: string,
                     private readonly _repoName: string) {
  }

  public async uploadAsync(from: string, to: string): Promise<void> {
  }

  private async _createReleaseTag(ver: string): Promise<void> {
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
        tag_name: `v${currentTag}`,
        name: `v${currentTag}`,
        body: `v${currentTag}`,
      }));

      req.end();
    });
  }
}