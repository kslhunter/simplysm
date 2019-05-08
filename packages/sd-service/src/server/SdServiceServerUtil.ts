import * as url from "url";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export class SdServiceServerUtil {
  public static async getConfigAsync(rootPath: string, requestUrl?: string): Promise<{ [key: string]: any }> {
    if (!requestUrl) {
      if (!await fs.pathExists(path.resolve(rootPath, ".configs.json"))) {
        throw new Error("서버에서 설정파일을 찾는데 실패하였습니다." + os.EOL + rootPath);
      }

      return await fs.readJson(path.resolve(rootPath, ".configs.json"));
    }

    const urlObj = url.parse(requestUrl, true, false);
    const urlPath = decodeURI(urlObj.pathname!.slice(1));
    const localPath = path.resolve(rootPath, "www", urlPath);
    const localDirPath = (await fs.lstat(localPath)).isDirectory() ? localPath : path.dirname(localPath);

    const chain: string[] = [];
    const findConfigsJsonPathAsync = async (dirPath: string): Promise<string | undefined> => {
      chain.push(dirPath);

      const filePath = path.resolve(dirPath, ".configs.json");
      if (await fs.pathExists(filePath)) {
        return filePath;
      }

      if (path.resolve(rootPath).startsWith(path.resolve(dirPath))) {
        return undefined;
      }

      return await findConfigsJsonPathAsync(path.resolve(dirPath, ".."));
    };

    const configsJsonPath = await findConfigsJsonPathAsync(localDirPath);
    if (!configsJsonPath) {
      throw new Error("서버에서 설정파일을 찾는데 실패하였습니다." + os.EOL + chain.join(os.EOL));
    }

    return await fs.readJson(configsJsonPath);
  }
}
