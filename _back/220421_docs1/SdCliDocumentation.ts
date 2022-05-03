import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import { INpmConfig, ITsconfig } from "../commons";
import path from "path";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import TypeDoc from "typedoc";
import ts from "typescript";

export class SdCliDocumentation {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _npmConfig: INpmConfig;

  public constructor(private readonly _rootPath: string) {
    const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);
  }

  public async runAsync(watch: boolean): Promise<void> {
    const pkgPaths = await this._getPackagePathsAsync();

    await pkgPaths.parallelAsync(async (pkgPath) => {
      const tsconfigPath = path.resolve(pkgPath, "tsconfig.json");
      const isTs = FsUtil.exists(tsconfigPath);

      const npmConfig = FsUtil.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;
      const isAngular = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults.includes("@angular/core");

      const outputDir = path.resolve(pkgPath, "docs");

      if (!isTs) {
        this._logger.warn(`[${npmConfig.name}] JS 문서생성 미구현`);
      }
      else {
        if (isAngular) {
          this._logger.warn(`[${npmConfig.name}] TS NG 문서생성 미구현`);
        }
        else {
          const tsconfig = FsUtil.readJson(tsconfigPath) as ITsconfig;
          const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, pkgPath, tsconfig.angularCompilerOptions);

          const app = new TypeDoc.Application();

          app.options.addReader(new TypeDoc.TypeDocReader());
          app.options.addReader(new TypeDoc.TSConfigReader());

          app.bootstrap({
            cleanOutputDir: true,
            tsconfig: PathUtil.posix(path.relative(this._rootPath, tsconfigPath)),
            logLevel: TypeDoc.LogLevel.Error,
            entryPoints: parsedTsconfig.fileNames.map((item) => PathUtil.posix(path.relative(this._rootPath, item))),
            watch,
            preserveWatchOutput: true,
            exclude: [outputDir]
          });

          if (watch) {
            app.convertAndWatch(async (proj) => {
              this._logger.debug(`[${npmConfig.name}] TS 문서생성을 시작합니다.`);
              await app.generateDocs(proj, outputDir);
              this._logger.debug(`[${npmConfig.name}] TS 문서생성이 완료되었습니다.`);
            });
          }
          else {
            const proj = app.convert();
            if (proj) {
              this._logger.debug(`[${npmConfig.name}] TS 문서생성을 시작합니다.`);
              await app.generateDocs(proj, outputDir);
              this._logger.debug(`[${npmConfig.name}] TS 문서생성이 완료되었습니다.`);
            }
          }
        }
      }
    });
  }

  private async _getPackagePathsAsync(): Promise<string[]> {
    const pkgRootPaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!pkgRootPaths) {
      throw new Error("최상위 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }

    return pkgRootPaths;
  }
}
