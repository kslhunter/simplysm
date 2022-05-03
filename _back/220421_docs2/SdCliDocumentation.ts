import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { INpmConfig } from "../commons";
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

    const pkgInfos: { rootPath: string; isTs: boolean; isAngular: boolean; files?: string[] }[] = [];
    for (const pkgPath of pkgPaths) {
      const tsconfigPath = path.resolve(pkgPath, "tsconfig.json");
      const isTs = FsUtil.exists(tsconfigPath);

      const tsconfig = isTs ? FsUtil.readJson(tsconfigPath) : undefined;
      const parsedTsconfig = isTs ? ts.parseJsonConfigFileContent(tsconfig, ts.sys, pkgPath, tsconfig.angularCompilerOptions) : undefined;

      const npmConfig = FsUtil.readJson(path.resolve(pkgPath, "package.json"));
      const isAngular = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults.includes("@angular/core");
      pkgInfos.push({ rootPath: pkgPath, isTs, isAngular, files: parsedTsconfig?.fileNames });
    }

    const tsNoneAngularPkgInfos = pkgInfos.filter((item) => item.isTs && !item.isAngular);
    if (tsNoneAngularPkgInfos.length > 0) {
      const outputDir = path.resolve(this._rootPath, "docs");

      const app = new TypeDoc.Application();

      app.options.addReader(new TypeDoc.TypeDocReader());
      app.options.addReader(new TypeDoc.TSConfigReader());

      app.bootstrap({
        cleanOutputDir: true,
        logLevel: TypeDoc.LogLevel.Error,
        entryPoints: tsNoneAngularPkgInfos.mapMany((item) => item.files!).distinct(),
        // entryPointStrategy: "packages",
        watch,
        preserveWatchOutput: watch
      });
      if (watch) {
        app.convertAndWatch(async (proj) => {
          this._logger.debug(`TS 문서생성을 시작합니다.`);
          await app.generateDocs(proj, outputDir);
          this._logger.debug(`TS 문서생성이 완료되었습니다.`);
        });
      }
      else {
        const project = app.convert();
        if (project) {
          this._logger.debug(`TS 문서생성을 시작합니다.`);
          await app.generateDocs(project, outputDir);
          this._logger.debug(`TS 문서생성이 완료되었습니다.`);
        }
      }
    }

    const tsAngularPkgPaths = pkgInfos.filter((item) => item.isTs && item.isAngular).map((item) => item.rootPath);
    if (tsAngularPkgPaths.length > 0) {
      this._logger.warn(`TS NG 문서생성 미구현\n${tsAngularPkgPaths.map((item) => "- " + item).join("\n")})`);
    }

    const jsPkgPaths = pkgInfos.filter((item) => !item.isTs).map((item) => item.rootPath);
    if (jsPkgPaths.length > 0) {
      this._logger.warn(`JS 문서생성 미구현\n${jsPkgPaths.map((item) => "- " + item).join("\n")})`);
    }
  }

  private async _getPackagePathsAsync(): Promise<string[]> {
    const pkgRootPaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!pkgRootPaths) {
      throw new Error("최상위 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }

    return pkgRootPaths;
  }
}
