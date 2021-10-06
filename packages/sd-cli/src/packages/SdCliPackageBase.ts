import { INpmConfig } from "../commons";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";

export abstract class SdCliPackageBase extends EventEmitter {
  public readonly npmConfigFilePath: string;
  public readonly npmConfig: INpmConfig;

  protected constructor(public readonly rootPath: string) {
    super();
    this.npmConfigFilePath = path.resolve(this.rootPath, "package.json");
    this.npmConfig = FsUtil.readJson(this.npmConfigFilePath);
  }

  public async setNewVersionAsync(projectName: string, version: string): Promise<void> {
    this.npmConfig.version = version;

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const dependencyName of Object.keys(deps)) {
        if (dependencyName.startsWith("@" + projectName + "/")) {
          deps[dependencyName] = version;
        }
      }
    };
    updateDepVersion(this.npmConfig.dependencies);
    updateDepVersion(this.npmConfig.devDependencies);
    updateDepVersion(this.npmConfig.peerDependencies);

    await FsUtil.writeJsonAsync(this.npmConfigFilePath, this.npmConfig, { space: 2 });
  }
}
