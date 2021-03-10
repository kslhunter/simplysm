import { FsUtil } from "@simplysm/sd-core-node";
import { ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { ISdProjectConfig } from "../commons";

export class SdProjectConfigUtil {
  private static async _loadConfigAsync(configFilePath: string, devMode: boolean, options: string[]): Promise<ISdProjectConfig> {
    const mode = devMode ? "development" : "production";

    const config = await FsUtil.readJsonAsync(configFilePath);
    if (config.packages !== undefined) {
      for (const packageName of Object.keys(config.packages)) {
        // extends 처리
        if (config.packages[packageName].extends !== undefined) {
          for (const extendKey of config.packages[packageName].extends) {
            const extendObj = config.extends[extendKey];
            config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], extendObj);
          }
          delete config.packages[packageName].extends;
        }

        // mode 처리
        if (config.packages[packageName][mode] !== undefined) {
          config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], config.packages[packageName][mode]);
        }
        delete config.packages[packageName].development;
        delete config.packages[packageName].production;

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
    }

    delete config.extends;

    return config;
  }

  private static _checkPackageConfig(packageName: string, config: Record<any, any>): void {
    if (config.type === "none") {
    }
    else if (config.type === "library") {
      if (config.targets !== undefined) {
        if (
          !(config.targets instanceof Array) ||
          !config.targets.every((item: any) => ["node", "browser"].includes(item))
        ) {
          throw new Error("패키지 '" + packageName + "'의 'targets'설정이 잘 못 되었습니다.");
        }
      }
      if (config.polyfills !== undefined) {
        if (
          !(config.polyfills instanceof Array) ||
          !config.polyfills.every((item: any) => typeof item === "string")
        ) {
          throw new Error("패키지 '" + packageName + "'의 'polyfills'설정이 잘 못 되었습니다.");
        }
      }
      if (config.publish !== undefined) {
        if (config.publish !== "npm") {
          throw new Error("패키지 '" + packageName + "'의 'publish'설정이 잘 못 되었습니다.");
        }
      }
    }
    else if (config.type === "client") {
      if (
        (config.server === undefined || typeof config.server !== "string" || config.server === "") &&
        (config.devServer === undefined)
      ) {
        throw new Error("패키지 '" + packageName + "'는 'server' 혹은 'devServer' 설정이 반드시 있어야 합니다.");
      }
      if (config.configs !== undefined) {
        if (!(typeof config.configs === "object")) {
          throw new Error("패키지 '" + packageName + "'의 'configs'설정이 잘 못 되었습니다.");
        }
      }
      if (config.env !== undefined) {
        if (
          (typeof config.env !== "object") ||
          (!Object.keys(config.env).every((item: string | number) => typeof item === "string")) ||
          (!Object.values(config.env).every((item) => typeof item === "string"))
        ) {
          throw new Error("패키지 '" + packageName + "'의 'env'설정이 잘 못 되었습니다.");
        }
      }
      if (config.platform !== undefined) {
        if (
          typeof config.platform !== "object" ||
          !["browser", "windows", "android"].includes(config.platform.type)
        ) {
          throw new Error("패키지 '" + packageName + "'의 'platform'설정이 잘 못 되었습니다.");
        }

        if (config.platform.type === "android") {
          if (
            (typeof config.platform.appId !== "string") ||
            (typeof config.platform.appName !== "string") ||
            (config.plugins !== undefined && ((!(config.plugins instanceof Array)) || !(config.plugins.every((item: any) => typeof item === "string")))) ||
            (config.icon !== undefined && typeof config.icon !== "string") ||
            (config.sign !== undefined && (
              (typeof config.sign.keystore !== "string") ||
              (typeof config.sign.storePassword !== "string") ||
              (typeof config.sign.alias !== "string") ||
              (typeof config.sign.password !== "string") ||
              (typeof config.sign.keystoreType !== "string")
            ))
          ) {
            throw new Error("패키지 '" + packageName + "'의 'platform'설정이 잘 못 되었습니다.");
          }
        }
      }
    }
    else if (config.type === "server") {
      if (config.configs !== undefined) {
        if (!(typeof config.configs === "object")) {
          throw new Error("패키지 '" + packageName + "'의 'configs'설정이 잘 못 되었습니다.");
        }
      }
      if (config.env !== undefined) {
        if (
          (typeof config.env !== "object") ||
          (!Object.keys(config.env).every((item: string | number) => typeof item === "string")) ||
          (!Object.values(config.env).every((item) => typeof item === "string"))
        ) {
          throw new Error("패키지 '" + packageName + "'의 'env'설정이 잘 못 되었습니다.");
        }
      }
    }
    else if (config.type === "test") {
    }
    else {
      throw new Error("패키지 '" + packageName + "'의 'type'설정이 잘 못 되었습니다.");
    }
  }

  public static async loadConfigAsync(devMode: boolean, options: string[], configFilePath?: string): Promise<ISdProjectConfig> {
    let config = await SdProjectConfigUtil._loadConfigAsync(path.resolve(process.cwd(), "simplysm.json"), devMode, options);

    if (configFilePath !== undefined) {
      const myConfigPath = path.resolve(process.cwd(), configFilePath);
      if (FsUtil.exists(myConfigPath)) {
        const myConfig = await SdProjectConfigUtil._loadConfigAsync(myConfigPath, devMode, options);
        config = ObjectUtil.merge(config, myConfig);
      }
    }

    for (const packageName of Object.keys(config.packages)) {
      this._checkPackageConfig(packageName, config.packages[packageName]);
    }

    return config;
  }
}