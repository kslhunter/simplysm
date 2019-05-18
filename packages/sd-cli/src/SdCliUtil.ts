import {ISdProjectConfig} from "./commons";
import * as fs from "fs-extra";
import * as path from "path";

export class SdCliUtil {
  public static async getConfigObjAsync(env: "development" | "production", opts?: string[]): Promise<ISdProjectConfig> {
    const config = await fs.readJson(path.resolve(process.cwd(), "simplysm.json"));
    for (const packageKey of Object.keys(config.packages)) {
      // extends 처리
      if (config.packages[packageKey].extends) {
        for (const extendKey of config.packages[packageKey].extends) {
          const extendObj = config.extends[extendKey];
          config.packages[packageKey] = Object.merge(config.packages[packageKey], extendObj);
        }
        delete config.packages[packageKey].extends;
      }

      // env 처리
      if (config.packages[packageKey][env]) {
        config.packages[packageKey] = Object.merge(config.packages[packageKey], config.packages[packageKey][env]);
      }
      delete config.packages[packageKey]["development"];
      delete config.packages[packageKey]["production"];

      // options 처리
      if (opts && opts.length > 0) {
        for (const opt of opts) {
          if (config.packages[packageKey]["@" + opt]) {
            config.packages[packageKey] = Object.merge(config.packages[packageKey], config.packages[packageKey]["@" + opt]);
          }
        }
      }

      for (const optKey of Object.keys(config.packages[packageKey]).filter(item => item.startsWith("@"))) {
        delete config.packages[packageKey][optKey];
      }
    }

    return config;
  }
}