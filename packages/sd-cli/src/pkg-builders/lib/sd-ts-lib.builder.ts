import path from "path";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { FsUtils, PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { ISdBuildMessage } from "../../types/build.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";

export class SdTsLibBuilder {
  private _tsCompiler: SdTsCompiler;

  constructor(
    private _pkgPath: TNormPath,
    dev: boolean,
    watchScopePaths: TNormPath[],
  ) {
    this._tsCompiler = new SdTsCompiler({
      pkgPath: this._pkgPath,
      additionalOptions: { declaration: true },
      isDevMode: dev,
      globalStyleFilePath: PathUtils.norm(this._pkgPath, "src/styles.scss"),
      isForBundle: false,
      watchScopePaths: watchScopePaths,
    });
  }

  async buildAsync(modifiedFileSet: Set<TNormPath>): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    results: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    const tsCompileResult = await this._tsCompiler.compileAsync(modifiedFileSet);

    const emitFileSet = new Set<TNormPath>();
    for (const emitFile of tsCompileResult.emitFileSet) {
      const emitFileInfos = tsCompileResult.emittedFilesCacheMap.get(emitFile);
      if (emitFileInfos) {
        for (const emitFileInfo of emitFileInfos) {
          if (emitFileInfo.outAbsPath != null) {
            FsUtils.writeFile(emitFileInfo.outAbsPath, emitFileInfo.text);
            emitFileSet.add(emitFileInfo.outAbsPath);
          }
        }
      }

      const globalStylesheetBundlingResult = tsCompileResult
        .stylesheetBundlingResultMap
        .get(emitFile);
      if (globalStylesheetBundlingResult && "outputFiles" in globalStylesheetBundlingResult) {
        for (const outputFile of globalStylesheetBundlingResult.outputFiles) {
          const distPath = PathUtils.norm(
            this._pkgPath,
            "dist",
            path.relative(this._pkgPath, outputFile.path),
          );
          if (PathUtils.isChildPath(distPath, path.resolve(this._pkgPath, "dist"))) {
            FsUtils.writeFile(distPath, outputFile.text);
            emitFileSet.add(distPath);
          }
        }
      }
    }

    const styleResults = Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
      .mapMany((item) =>
        SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(item, this._pkgPath),
      );

    return {
      watchFileSet: tsCompileResult.watchFileSet,
      affectedFileSet: tsCompileResult.affectedFileSet,
      results: [...tsCompileResult.messages, ...styleResults],
      emitFileSet,
    };
  }
}
