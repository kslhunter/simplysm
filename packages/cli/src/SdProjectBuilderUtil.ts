import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import {INpmConfig, ISdConfigFileJson, ISdPackageConfig, ISdProjectConfig, ITsConfig} from "./commons";
import {optional} from "@simplysm/common";

export class SdProjectBuilderUtil {
  public static getProjectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  public static getPackagesPath(...args: string[]): string {
    return SdProjectBuilderUtil.getProjectPath("packages", ...args);
  }

  public static getTsConfigPath(packageKey: string, isForBuild: boolean = false): string {
    return SdProjectBuilderUtil.getPackagesPath(packageKey, `tsconfig${isForBuild ? ".build" : ""}.json`);
  }

  public static readTsConfig(packageKey: string, isForBuild: boolean = false): ITsConfig {
    const tsconfigPath = SdProjectBuilderUtil.getTsConfigPath(packageKey, isForBuild);
    return fs.pathExistsSync(tsconfigPath) ? fs.readJsonSync(tsconfigPath) : {};
  }

  public static writeTsConfig(packageKey: string, tsconfig: ITsConfig, isForBuild: boolean = false): void {
    const tsconfigPath = SdProjectBuilderUtil.getTsConfigPath(packageKey, isForBuild);
    fs.writeJsonSync(tsconfigPath, tsconfig, {spaces: 2, EOL: os.EOL});
  }

  public static readConfig(env: "development" | "production", packageKeys: string[] | undefined): ISdProjectConfig {
    const orgConfig: ISdConfigFileJson = fs.readJsonSync(SdProjectBuilderUtil.getProjectPath("simplysm.json"));

    const result: ISdProjectConfig = {packages: {}};
    for (const packageKey of packageKeys || Object.keys(orgConfig.packages)) {
      if (!orgConfig.packages[packageKey]) {
        throw new Error(`"${packageKey}"에 대한 패키지 설정이 없습니다.`);
      }

      let currPackageConfig: ISdPackageConfig = {};
      currPackageConfig = SdProjectBuilderUtil._mergePackageConfigExtends(currPackageConfig, orgConfig, orgConfig.packages[packageKey].extends);
      if (currPackageConfig[env]) {
        currPackageConfig = Object.merge(currPackageConfig, currPackageConfig[env]);
      }

      if (orgConfig.packages[packageKey][env]) {
        currPackageConfig = Object.merge(currPackageConfig, orgConfig.packages[packageKey][env]);
      }

      const orgPackageConfig = Object.clone(orgConfig.packages[packageKey]);
      delete orgPackageConfig.extends;
      delete orgPackageConfig.development;
      delete orgPackageConfig.production;
      currPackageConfig = Object.merge(currPackageConfig, orgPackageConfig);

      if (!currPackageConfig.type) {
        throw new Error(`타입이 지정되지 않은 패키지가 있습니다. (${packageKey})`);
      }

      result.packages[packageKey] = currPackageConfig;
    }

    result.localUpdates = orgConfig.localUpdates;

    return result;
  }

  private static _mergePackageConfigExtends(curr: ISdPackageConfig, orgConfig: ISdConfigFileJson, extendNames?: string[]): ISdPackageConfig {
    if (extendNames) {
      let result = Object.clone(curr);
      for (const extendName of extendNames) {
        const extendConfig = optional(orgConfig, o => o.extends![extendName]);
        if (!extendConfig) {
          throw new Error(`설정에서 확장 "${extendName}"를 찾을 수 없습니다.`);
        }
        result = this._mergePackageConfigExtends(result, orgConfig, extendConfig.extends);
        result = Object.merge(result, extendConfig);
      }
      return result;
    }
    return Object.clone(curr);
  }

  public static getNpmConfigPath(packageKey: string): string {
    return SdProjectBuilderUtil.getPackagesPath(packageKey, "package.json");
  }

  public static readNpmConfig(packageKey: string): INpmConfig {
    const configPath = SdProjectBuilderUtil.getNpmConfigPath(packageKey);
    return fs.readJsonSync(configPath);
  }

  public static writeNpmConfig(packageKey: string, npmConfig: INpmConfig): void {
    const configPath = SdProjectBuilderUtil.getNpmConfigPath(packageKey);
    fs.writeJsonSync(configPath, npmConfig, {spaces: 2, EOL: os.EOL});
  }

  public static getProjectNpmConfigPath(): string {
    return SdProjectBuilderUtil.getProjectPath("package.json");
  }

  public static readProjectNpmConfig(): INpmConfig {
    const configPath = SdProjectBuilderUtil.getProjectNpmConfigPath();
    return fs.readJsonSync(configPath);
  }

  public static getTsLintPath(packageKey: string): string {
    return SdProjectBuilderUtil.getPackagesPath(packageKey, "tslint.json");
  }
}
