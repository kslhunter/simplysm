import path from "path";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { FsUtil, PathUtil, type TNormPath } from "@simplysm/sd-core-node";
import { type ISdBuildMessage } from "../../types/build.type";
import { SdTsCompiler } from "../../ts-builder/SdTsCompiler";

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
      globalStyleFilePath: PathUtil.norm(this._pkgPath, "src/styles.scss"),
      isForBundle: false,
      watchScopePaths: watchScopePaths,
    });
  }

  public async buildAsync(modifiedFileSet: Set<TNormPath>): Promise<{
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
            FsUtil.writeFile(emitFileInfo.outAbsPath, emitFileInfo.text);
            emitFileSet.add(emitFileInfo.outAbsPath);
          }
        }
      }

      const globalStylesheetBundlingResult = tsCompileResult.stylesheetBundlingResultMap.get(emitFile);
      if (globalStylesheetBundlingResult) {
        for (const outputFile of globalStylesheetBundlingResult.outputFiles ?? []) {
          const distPath = PathUtil.norm(this._pkgPath, "dist", path.relative(this._pkgPath, outputFile.path));
          if (PathUtil.isChildPath(distPath, path.resolve(this._pkgPath, "dist"))) {
            FsUtil.writeFile(distPath, outputFile.text);
            emitFileSet.add(distPath);
          }
        }
      }
    }

    const styleResults = Array.from(tsCompileResult.stylesheetBundlingResultMap.values()).mapMany((item) =>
      SdCliConvertMessageUtil.convertToBuildMessagesFromEsbuild(item, this._pkgPath),
    );

    return {
      watchFileSet: tsCompileResult.watchFileSet,
      affectedFileSet: tsCompileResult.affectedFileSet,
      results: [...tsCompileResult.messages, ...styleResults],
      emitFileSet,
    };
  }
}
