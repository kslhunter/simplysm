import { ISdCliConfig, TSdCliPackageConfig } from "../commons";
import { FsUtil } from "@simplysm/sd-core-node";
import { ObjectUtil } from "@simplysm/sd-core-common";
import path from "path";

export class SdCliConfigUtil {
  public static async loadConfigAsync(confFilePath: string, isDev: boolean, opts?: string[]): Promise<ISdCliConfig> {
    const confFileCont = await FsUtil.readJsonAsync(confFilePath);
    let conf = this._getConfigFromFileContent(confFileCont, isDev, opts);

    // extends
    if (conf.extends) {
      for (const extConfFilePath of conf.extends) {
        const extConf = await this.loadConfigAsync(path.resolve(path.dirname(confFilePath), extConfFilePath), isDev, opts);
        conf = this._mergeObj(extConf, conf);
      }
    }
    delete conf["extends"];

    return conf as ISdCliConfig;
  }

  private static _getConfigFromFileContent(confFileCont: ISdCliConfigFileContent, isDev: boolean, opts?: string[]): ISdCliConfigFileContent {
    const conf = ObjectUtil.clone(confFileCont);

    if (conf.packages) {
      for (const pkgName of Object.keys(conf.packages)) {
        conf.packages[pkgName] = this._getPkgConfigFromFileContent(conf, conf.packages[pkgName], isDev, opts);
      }
    }
    return conf;
  }

  private static _getPkgConfigFromFileContent(confFileCont: ISdCliConfigFileContent, pkgConfFileCont: TSdCliPackageConfigFileContent, isDev: boolean, opts?: string[]): TSdCliPackageConfig {
    let pkgConf = ObjectUtil.clone(pkgConfFileCont);

    // override
    const pkgOvrNames = pkgConf.overrides;
    if (pkgOvrNames) {
      for (const pkgOvrName of pkgOvrNames) {
        const rootOvr = confFileCont.overrides?.[pkgOvrName];
        if (rootOvr) {
          const ovrConf = this._getPkgConfigFromFileContent(confFileCont, rootOvr, isDev, opts);
          pkgConf = this._mergeObj(pkgConf, ovrConf);
        }
      }
      delete pkgConf.overrides;
    }


    // mode 처리
    const mode = isDev ? "dev" : "prod";
    if (pkgConf[mode] !== undefined) {
      const modeConf = this._getPkgConfigFromFileContent(confFileCont, pkgConf[mode], isDev, opts);
      pkgConf = this._mergeObj(pkgConf, modeConf);
    }
    delete pkgConf["dev"];
    delete pkgConf["prod"];

    // options
    if (opts && opts.length > 0) {
      const pkgOpts = Object.keys(pkgConf).filter((key) => key.startsWith("@") && opts.some((opt) => opt === key.slice(1)));

      for (const pkgOpt of pkgOpts) {
        const optConf = this._getPkgConfigFromFileContent(confFileCont, pkgConf[pkgOpt], isDev, opts);
        pkgConf = this._mergeObj(pkgConf, optConf);
      }

      for (const optKey of Object.keys(pkgConf).filter((item) => item.startsWith("@"))) {
        delete pkgConf[optKey];
      }
    }

    return pkgConf;
  }

  private static _mergeObj<A, B>(orig: A, target: B): A & B {
    return ObjectUtil.merge(orig, target, {
      arrayProcess: "replace",
      useDelTargetNull: true
    });
  }
}

interface ISdCliConfigFileContent {
  packages?: Record<string, TSdCliPackageConfigFileContent>;
  overrides?: Record<string, TSdCliPackageConfigFileContent>;
  extends?: string[];
}

type TSdCliPackageConfigFileContent =
  TSdCliPackageConfig
  & { overrides?: string[] }
  & Record<string, any>;
