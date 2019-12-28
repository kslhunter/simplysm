import * as path from "path";
import * as fs from "fs-extra";
import {ObjectUtil} from "@simplysm/sd-core-common";
import {ISdProjectConfig} from "./common";

export class SdCliUtil {
  public static async getConfigObjAsync(mode: "development" | "production", opts?: string[]): Promise<ISdProjectConfig> {
    const config = await fs.readJson(path.resolve(process.cwd(), "simplysm.json"));

    for (const packageKey of Object.keys(config.packages)) {
      // extends 처리
      if (config.packages[packageKey].extends) {
        for (const extendKey of config.packages[packageKey].extends) {
          const extendObj = config.extends[extendKey];
          config.packages[packageKey] = ObjectUtil.merge(config.packages[packageKey], extendObj);
        }
        delete config.packages[packageKey].extends;
      }

      // mode 처리
      if (config.packages[packageKey][mode]) {
        config.packages[packageKey] = ObjectUtil.merge(config.packages[packageKey], config.packages[packageKey][mode]!);
      }
      delete config.packages[packageKey]["development"];
      delete config.packages[packageKey]["production"];

      // options 처리
      if (opts && opts.length > 0) {
        const pkgOpts = Object.keys(config.packages[packageKey])
          .filter((key) => key.startsWith("@") && opts.some((opt) => opt === key.slice(1)));

        for (const pkgOpt of pkgOpts) {
          config.packages[packageKey] = ObjectUtil.merge(config.packages[packageKey], config.packages[packageKey][pkgOpt]);
        }
      }

      for (const optKey of Object.keys(config.packages[packageKey]).filter((item) => item.startsWith("@"))) {
        delete config.packages[packageKey][optKey];
      }

      // type 채우기
      config.packages[packageKey].type = config.packages[packageKey].type || "library";
    }

    delete config.extends;

    return config;
  }
}