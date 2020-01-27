import * as path from "path";
import {ObjectUtil} from "@simplysm/sd-core-common";
import * as ts from "typescript";
import {FsUtil} from "@simplysm/sd-core-node";

export class SdTsConfig {
  private readonly _packagePath: string;

  public get distPath(): string {
    return this.parsedConfigForBuild.options.outDir
      ? path.resolve(this.parsedConfigForBuild.options.outDir)
      : path.resolve(this._packagePath, "dist");
  }

  public get srcPath(): string {
    return this.parsedConfigForBuild.options.rootDir
      ? path.resolve(this.parsedConfigForBuild.options.rootDir)
      : path.resolve(this._packagePath, "src");
  }

  private constructor(private readonly _configPath: string,
                      public readonly configForBuildPath: string,
                      private readonly _configForBuild: any,
                      public parsedConfigForBuild: ts.ParsedCommandLine) {
    this._packagePath = path.dirname(this._configPath);
  }

  public static async loadAsync(configPath: string): Promise<SdTsConfig> {
    const config = await FsUtil.readJsonAsync(configPath);

    const configForBuild = ObjectUtil.clone(config);
    const tsConfigOptions = configForBuild.compilerOptions;
    if (tsConfigOptions.baseUrl && tsConfigOptions.paths) {
      for (const tsPathKey of Object.keys(tsConfigOptions.paths)) {
        const result = [];
        for (const tsPathValue of tsConfigOptions.paths[tsPathKey] as string[]) {
          result.push(tsPathValue.replace(/\/src\/index\..*ts$/, ""));
        }
        tsConfigOptions.paths[tsPathKey] = result;
      }
    }

    if (configForBuild.extends.startsWith("tsconfig") || configForBuild.extends.startsWith("./tsconfig")) {
      const extendsExtName = path.extname(configForBuild.extends);
      const extendsBaseName = path.basename(configForBuild.extends, extendsExtName);
      configForBuild.extends = "./" + extendsBaseName + ".build" + extendsExtName;
    }

    const dirName = path.dirname(configPath);
    const extName = path.extname(configPath);
    const baseName = path.basename(configPath, extName);

    const configForBuildPath = path.resolve(dirName, baseName + ".build" + extName);

    const parsedConfigForBuild = ts.parseJsonConfigFileContent(configForBuild, ts.sys, path.dirname(configPath));

    return new SdTsConfig(configPath, configForBuildPath, configForBuild, parsedConfigForBuild);
  }

  public async saveForBuildAsync(): Promise<void> {
    await FsUtil.writeJsonAsync(this.configForBuildPath, this._configForBuild, {space: 2});
  }
}
