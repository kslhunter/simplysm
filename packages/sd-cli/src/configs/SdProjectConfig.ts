import * as fs from "fs-extra";
import {ObjectUtil} from "@simplysm/sd-core-common";
import {TSdPackageConfig} from "../commons";

export class SdProjectConfig {
  public get packages(): { [packageKey: string]: TSdPackageConfig } {
    return this._config.packages;
  }

  public get localDependencies(): { [key: string]: string } | undefined {
    return this._config.localDependencies;
  }

  public get localUpdates(): { [p: string]: string } | undefined {
    return this._config.localUpdates;
  }

  private constructor(private readonly _config: any) {
  }

  public static async loadAsync(configFilePath: string, mode: "development" | "production", options: string[]): Promise<SdProjectConfig> {
    const config = await fs.readJson(configFilePath);
    for (const packageName of Object.keys(config.packages)) {
      // extends 처리
      if (config.packages[packageName].extends) {
        for (const extendKey of config.packages[packageName].extends) {
          const extendObj = config.extends[extendKey];
          config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], extendObj);
        }
        delete config.packages[packageName].extends;
      }

      // mode 처리
      if (config.packages[packageName][mode]) {
        config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], config.packages[packageName][mode]);
      }
      delete config.packages[packageName]["development"];
      delete config.packages[packageName]["production"];

      // options 처리
      if (options.length > 0) {
        const pkgOpts = Object.keys(config.packages[packageName])
          .filter((key) => key.startsWith("@") && options.some((opt) => opt === key.slice(1)));

        for (const pkgOpt of pkgOpts) {
          config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], config.packages[packageName][pkgOpt]);
        }
      }

      for (const optKey of Object.keys(config.packages[packageName]).filter((item) => item.startsWith("@"))) {
        delete config.packages[packageName][optKey];
      }
    }

    delete config.extends;

    return new SdProjectConfig(config);
  }
}
