import path from "path";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { SdTsBuilder } from "../../ts-builder/SdTsBuilder";
import { ISdBuildMessage } from "../../commons";

export class SdTsLibBuilder {
  static async new(pkgPath: string, dev: boolean, watchScopePaths: string[]) {
    const tsBuilder = await SdTsBuilder.new({
      pkgPath,
      additionalOptions: { declaration: true },
      isDevMode: dev,
      globalStyleFilePath: path.resolve(pkgPath, "src/styles.scss"),
      isForBundle: false,
      watchScopePaths: watchScopePaths,
    });

    return new SdTsLibBuilder(tsBuilder, pkgPath);
  }

  private constructor(
    private _builder: SdTsBuilder,
    private _pkgPath: string,
  ) {}

  public async markChangesAsync(modifiedFileSet: Set<string>) {
    await this._builder.invalidateAsync(modifiedFileSet);
  }

  public async buildAsync(): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdBuildMessage[];
  }> {
    const tsBuildResult = await this._builder.buildAsync();

    for (const emitFile of tsBuildResult.emitFileSet) {
      const emitFileInfos = tsBuildResult.emittedFilesCacheMap.get(emitFile);
      if (emitFileInfos) {
        for (const emitFileInfo of emitFileInfos) {
          if (emitFileInfo.outAbsPath != null) {
            await FsUtil.writeFileAsync(emitFileInfo.outAbsPath, emitFileInfo.text);
          }
        }
      }

      const globalStylesheetBundlingResult = tsBuildResult.stylesheetBundlingResultMap.get(emitFile);
      if (globalStylesheetBundlingResult) {
        for (const outputFile of globalStylesheetBundlingResult.outputFiles) {
          const distPath = path.resolve(this._pkgPath, "dist", path.relative(this._pkgPath, outputFile.path));
          if (PathUtil.isChildPath(distPath, path.resolve(this._pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, outputFile.text);
          }
        }
      }
    }

    const typescriptResult = tsBuildResult.messages;

    const styleResults = Array.from(tsBuildResult.stylesheetBundlingResultMap.values()).mapMany((item) =>
      SdCliConvertMessageUtil.convertToBuildMessagesFromEsbuild(item),
    );

    const lintResults = SdCliConvertMessageUtil.convertToBuildMessagesFromEslint(tsBuildResult.lintResults);

    return {
      watchFileSet: tsBuildResult.watchFileSet,
      affectedFileSet: tsBuildResult.affectedFileSet,
      results: [...typescriptResult, ...styleResults, ...lintResults],
    };
  }
}
