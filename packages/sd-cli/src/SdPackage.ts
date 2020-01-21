import {SdNpmConfig} from "./configs/SdNpmConfig";
import {SdProjectConfig} from "./configs/SdProjectConfig";
import {TSdPackageConfig} from "./commons";
import {FsUtil} from "@simplysm/sd-core-node";
import * as path from "path";
import {SdTsConfig} from "./configs/SdTsConfig";

export class SdPackage {
  private constructor(public readonly npmConfig: SdNpmConfig,
                      public readonly config: TSdPackageConfig | undefined,
                      public readonly tsConfigs: SdTsConfig[],
                      public readonly packagePath: string,
                      public readonly packageKey: string) {
  }

  public static async createAsync(projectConfig: SdProjectConfig, packagePath: string): Promise<SdPackage> {
    const npmConfig = await SdNpmConfig.loadAsync(packagePath);
    const config = projectConfig.packages[npmConfig.name];

    const tsConfigsFilePaths = await FsUtil.globAsync(path.resolve(packagePath, "tsconfig!(*.build).json"));
    const tsConfigs = await tsConfigsFilePaths.mapAsync(async (tsConfigsFilePath) => await SdTsConfig.loadAsync(tsConfigsFilePath));

    const packageKey = path.basename(packagePath);

    return new SdPackage(npmConfig, config, tsConfigs, packagePath, packageKey);
  }
}
