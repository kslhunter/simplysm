import { ISdProjectConfig, TSdPackageConfig } from "../commons";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdProjectConfigUtil {
  public static async loadConfigAsync(rootPath: string, isDevMode?: boolean, options?: string[], configFilePath?: string): Promise<ISdProjectConfig> {
    const config = await this._loadConfigFileContentAsync(path.resolve(rootPath, configFilePath ?? "simplysm.json"));

    if (config.packages !== undefined) {
      const mode = isDevMode ? "development" : "production";

      for (const packageName of Object.keys(config.packages)) {
        // override 처리
        if (config.packages[packageName].overrides !== undefined) {
          for (const overrideKey of config.packages[packageName].overrides!) {
            const overrideObj = config.overrides![overrideKey];
            config.packages[packageName] = this._mergeObj(config.packages[packageName], overrideObj);
          }
          delete config.packages[packageName].overrides;
        }

        // mode 처리
        if (config.packages[packageName][mode] !== undefined) {
          config.packages[packageName] = this._mergeObj(config.packages[packageName], config.packages[packageName][mode]);
        }
        delete config.packages[packageName].development;
        delete config.packages[packageName].production;

        // options 처리
        if (options && options.length > 0) {
          const pkgOpts = Object.keys(config.packages[packageName])
            .filter((key) => key.startsWith("@") && options.some((opt) => opt === key.slice(1)));

          for (const pkgOpt of pkgOpts) {
            config.packages[packageName] = this._mergeObj(config.packages[packageName], config.packages[packageName][pkgOpt]);
          }
        }

        for (const optKey of Object.keys(config.packages[packageName]).filter((item) => item.startsWith("@"))) {
          delete config.packages[packageName][optKey];
        }
      }
    }

    return config as ISdProjectConfig;
  }

  private static async _loadConfigFileContentAsync(filePath: string): Promise<Omit<ISdProjectConfigFileContent, "extends">> {
    const orgConfig = await FsUtil.readJsonAsync(filePath) as ISdProjectConfigFileContent;

    let mergedConfig: ISdProjectConfigFileContent | undefined;
    if (orgConfig.extends) {
      for (const extConfigFilePath of orgConfig.extends) {
        const extConfigFileFullPath = path.resolve(path.dirname(filePath), extConfigFilePath);
        const extConfig = await this._loadConfigFileContentAsync(extConfigFileFullPath);
        mergedConfig = this._mergeObj(mergedConfig, extConfig);
      }
    }
    mergedConfig = this._mergeObj(mergedConfig, orgConfig);

    delete mergedConfig!.extends;

    return mergedConfig!;
  }

  private static _mergeObj<T>(org: T, target: Partial<T>): T {
    return ObjectUtil.merge(org, target, {
      arrayProcess: "replace",
      useDelTargetUndefined: true
    });
  }
}

interface ISdProjectConfigFileContent {
  packages?: Record<string, TSdPackageConfigFileContent>;
  extends?: string[];
  overrides?: Record<string, TSdPackageConfigFileContent>;
}

type TSdPackageConfigFileContent =
  Partial<TSdPackageConfig>
  & { overrides?: string[] }
  & Record<string, any>;
