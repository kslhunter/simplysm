import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import {
  INpmConfig,
  ISdClientPackageConfig,
  ISdConfigFileJson,
  ISdConfigFileJsonBuildConfig,
  ISdConfigFileJsonPublishConfig,
  ISdPackageBuilderConfig,
  ITsConfig,
  SdPackageType
} from "./commons";
import {optional} from "@simplysm/common";

export class SdPackageUtil {
  public static getProjectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  public static getPackagesPath(...args: string[]): string {
    return SdPackageUtil.getProjectPath("packages", ...args);
  }

  public static getTsConfigPath(packageKey: string, isForBuild: boolean = false): string {
    return SdPackageUtil.getPackagesPath(packageKey, `tsconfig${isForBuild ? ".build" : ""}.json`);
  }

  public static async readTsConfigAsync(packageKey: string, isForBuild: boolean = false): Promise<ITsConfig> {
    const tsconfigPath = SdPackageUtil.getTsConfigPath(packageKey, isForBuild);
    return await fs.pathExists(tsconfigPath) ? await fs.readJson(tsconfigPath) : {};
  }

  public static async writeTsConfigAsync(packageKey: string, tsconfig: ITsConfig, isForBuild: boolean = false): Promise<void> {
    const tsconfigPath = SdPackageUtil.getTsConfigPath(packageKey, isForBuild);
    await fs.writeJson(tsconfigPath, tsconfig, {spaces: 2, EOL: os.EOL});
  }

  public static getConfigPath(): string {
    return SdPackageUtil.getProjectPath("simplysm.json");
  }

  public static async readConfigAsync(): Promise<ISdConfigFileJson> {
    const configPath = SdPackageUtil.getConfigPath();
    return await fs.readJson(configPath);
  }

  public static createBuilderConfig(commonConfig: ISdConfigFileJsonBuildConfig | undefined, envConfig: ISdConfigFileJsonBuildConfig | undefined, publishConfig: ISdConfigFileJsonPublishConfig | undefined): ISdPackageBuilderConfig {
    const result: ISdPackageBuilderConfig = {packages: {}};

    const commonConfigTemp = optional(commonConfig, o => o.packages) || {};
    for (const key of Object.keys(commonConfigTemp)) {
      if (typeof commonConfigTemp[key] === "string") {
        commonConfigTemp[key] = {type: commonConfigTemp[key] as SdPackageType};
      }
    }

    const envConfigTemp = optional(envConfig, o => o.packages) || {};
    for (const key of Object.keys(envConfigTemp)) {
      if (typeof envConfigTemp[key] === "string") {
        envConfigTemp[key] = {type: envConfigTemp[key] as SdPackageType};
      }
    }

    result.packages = Object.merge(commonConfigTemp, envConfigTemp) as { [key: string]: ISdClientPackageConfig };
    result.port = optional(envConfig, o => o.port) || optional(commonConfig, o => o.port);
    result.virtualHosts = Object.merge(optional(commonConfig, o => o.virtualHosts), optional(envConfig, o => o.virtualHosts));
    result.options = Object.merge(optional(commonConfig, o => o.options), optional(envConfig, o => o.options));


    if (publishConfig && publishConfig.packages) {
      for (const publishPackageKey of Object.keys(publishConfig.packages)) {
        const publishTargetName = publishConfig.packages[publishPackageKey];
        if (publishTargetName === "npm") {
          if (result.packages[publishPackageKey]) {
            result.packages[publishPackageKey].publish = "npm";
          }
        }
        else if (publishConfig.targets) {
          const publishTarget = publishConfig.targets[publishTargetName];
          if (!publishTarget) {
            throw new Error(`배포 타겟 "${publishTargetName}"를 찾을 수 없습니다.`);
          }
          result.packages[publishPackageKey].publish = publishTarget;
        }
        else {
          throw new Error(`배포 타겟 "${publishTargetName}"를 찾을 수 없습니다.`);
        }
      }
    }

    return result;
  }

  public static getNpmConfigPath(packageKey: string): string {
    return SdPackageUtil.getPackagesPath(packageKey, "package.json");
  }

  public static async readNpmConfig(packageKey: string): Promise<INpmConfig> {
    const configPath = SdPackageUtil.getNpmConfigPath(packageKey);
    return await fs.readJson(configPath);
  }

  public static async writeNpmConfig(packageKey: string, npmConfig: INpmConfig): Promise<void> {
    const configPath = SdPackageUtil.getNpmConfigPath(packageKey);
    await fs.writeJson(configPath, npmConfig, {spaces: 2, EOL: os.EOL});
  }

  public static getProjectNpmConfigPath(): string {
    return SdPackageUtil.getProjectPath("package.json");
  }

  public static async readProjectNpmConfig(): Promise<INpmConfig> {
    const configPath = SdPackageUtil.getProjectNpmConfigPath();
    return await fs.readJson(configPath);
  }

  public static getTsLintPath(packageKey: string): string {
    return SdPackageUtil.getPackagesPath(packageKey, "tslint.json");
  }
}
