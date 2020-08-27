import { ISdProjectConfig, TSdPackageConfig } from "./commons";
import { FsUtils } from "@simplysm/sd-core-node";
import { ObjectUtils } from "@simplysm/sd-core-common";
import * as path from "path";

export class SdProjectConfigUtils {
  private static async _loadConfigAsync(configFilePath: string, devMode: boolean, options: string[]): Promise<ISdProjectConfig> {
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

      //오류 체크
      const pkgConfig = config.packages[packageName] as TSdPackageConfig;
      if (pkgConfig.type === "android") {
        if (!pkgConfig.appId || !pkgConfig.appName) {
          throw new Error("'android'빌드 설정에는 반드시, 'appId', 'appName'이/가 설정되어 있어야 합니다.");
        }
      }
    }

    delete config.extends;

    return config;
  }

  public static async loadConfigAsync(devMode: boolean, options: string[], configFileName?: string): Promise<ISdProjectConfig> {
    let config = await SdProjectConfigUtils._loadConfigAsync(path.resolve(process.cwd(), "simplysm.json"), devMode, options);

    if (configFileName !== undefined) {
      const myConfigPath = path.resolve(process.cwd(), configFileName);
      if (FsUtils.exists(myConfigPath)) {
        const myConfig = await SdProjectConfigUtils._loadConfigAsync(myConfigPath, devMode, options);
        config = ObjectUtils.merge(config, myConfig);
      }
    }

    return config;
  }
}