import {ISdProjectConfig} from "./commons";
import {FsUtils} from "@simplysm/sd-core-node";
import {ObjectUtils} from "@simplysm/sd-core-common";

export class SdProjectConfigUtils {
  public static async loadConfigAsync(configFilePath: string, devMode: boolean, options: string[]): Promise<ISdProjectConfig> {
    const mode = devMode ? "development" : "production";

    const config = await FsUtils.readJsonAsync(configFilePath);
    for (const packageName of Object.keys(config.packages)) {
      // extends 처리
      if (config.packages[packageName].extends !== undefined) {
        for (const extendKey of config.packages[packageName].extends) {
          const extendObj = config.extends[extendKey];
          config.packages[packageName] = ObjectUtils.merge(config.packages[packageName], extendObj);
        }
        delete config.packages[packageName].extends;
      }

      // mode 처리
      if (config.packages[packageName][mode] !== undefined) {
        config.packages[packageName] = ObjectUtils.merge(config.packages[packageName], config.packages[packageName][mode]);
      }
      delete config.packages[packageName].development;
      delete config.packages[packageName].production;

      // options 처리
      if (options.length > 0) {
        const pkgOpts = Object.keys(config.packages[packageName])
          .filter(key => key.startsWith("@") && options.some(opt => opt === key.slice(1)));

        for (const pkgOpt of pkgOpts) {
          config.packages[packageName] = ObjectUtils.merge(config.packages[packageName], config.packages[packageName][pkgOpt]);
        }
      }

      for (const optKey of Object.keys(config.packages[packageName]).filter(item => item.startsWith("@"))) {
        delete config.packages[packageName][optKey];
      }
    }

    delete config.extends;

    return config;
  }
}