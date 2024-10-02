import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import { ISdCliPackageBuildResult } from "../commons";
import { SdTsCompiler } from "./SdTsCompiler";
import ts from "typescript";
import path from "path";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";

export class SdTsLibBundler {
  readonly #compiler: SdTsCompiler;

  readonly #pkgPath: string;

  public constructor(pkgPath: string, dev: boolean, watchScopePaths: string[]) {
    this.#pkgPath = pkgPath;
    this.#compiler = new SdTsCompiler({
      pkgPath,
      additionalOptions: { declaration: true },
      isDevMode: dev,
      globalStyleFilePath: path.resolve(pkgPath, "src/styles.scss"),
      isForBundle: false,
      watchScopePaths: watchScopePaths,
    });
  }

  public markChanges(modifiedFileSet: Set<string>): void {
    this.#compiler.invalidate(modifiedFileSet);
  }

  public async buildAsync(): Promise<{
    program: ts.Program;
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdCliPackageBuildResult[];
  }> {
    const buildResult = await this.#compiler.buildAsync();

    for (const emitFile of buildResult.emitFileSet) {
      const emitFileInfos = buildResult.emittedFilesCacheMap.get(emitFile);
      if (emitFileInfos) {
        for (const emitFileInfo of emitFileInfos) {
          if (emitFileInfo.outAbsPath != null) {
            await FsUtil.writeFileAsync(emitFileInfo.outAbsPath, emitFileInfo.text);
          }
        }
      }

      const globalStylesheetBundlingResult = buildResult.stylesheetBundlingResultMap.get(emitFile);
      if (globalStylesheetBundlingResult) {
        for (const outputFile of globalStylesheetBundlingResult.outputFiles) {
          const distPath = path.resolve(this.#pkgPath, "dist", path.relative(this.#pkgPath, outputFile.path));
          if (PathUtil.isChildPath(distPath, path.resolve(this.#pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, outputFile.text);
          }
        }
      }
    }

    return {
      program: buildResult.program,
      watchFileSet: buildResult.watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      results: [
        ...buildResult.typescriptDiagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item, "build")),
        ...Array.from(buildResult.stylesheetBundlingResultMap.values())
          .mapMany((item) => item.errors ?? [])
          .map((err) => SdCliBuildResultUtil.convertFromEsbuildResult(err, "build", "error")),
        /*...Array.from(buildResult.stylesheetResultMap.values()).mapMany(item => item.warnings!)
          .map(warn => SdCliBuildResultUtil.convertFromEsbuildResult(warn, "build", "warning"))*/
      ],
    };
  }
}
