import path from "path";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";
import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, HashUtils, PathUtils } from "@simplysm/sd-core-node";
import { SdTsCompiler } from "../../ts-compiler/SdTsCompiler";
import type { ISdBuildResult } from "../../types/build/ISdBuildResult";
import type { ISdTsCompilerOptions } from "../../types/build/ISdTsCompilerOptions";

export class SdTsLibBuilder {
  private readonly _tsCompiler: SdTsCompiler;
  private readonly _outputHashCache = new Map<TNormPath, string>();

  constructor(private readonly _opt: ISdTsCompilerOptions) {
    this._tsCompiler = new SdTsCompiler(_opt, false);
  }

  async buildAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    const tsCompileResult = await this._tsCompiler.compileAsync(modifiedFileSet ?? new Set());

    const emitFileSet = new Set<TNormPath>();
    for (const emitFile of tsCompileResult.emitFileSet) {
      const emitFileInfos = tsCompileResult.emittedFilesCacheMap.get(emitFile);
      if (emitFileInfos) {
        for (const emitFileInfo of emitFileInfos) {
          if (emitFileInfo.outAbsPath != null) {
            const emitFilePath = PathUtils.norm(emitFileInfo.outAbsPath);
            const prevHash = this._outputHashCache.get(emitFilePath);
            const currHash = HashUtils.get(Buffer.from(emitFileInfo.text));
            if (prevHash !== currHash) {
              FsUtils.writeFile(emitFilePath, emitFileInfo.text);
              this._outputHashCache.set(emitFilePath, currHash);
              emitFileSet.add(emitFilePath);
            }
          }
        }
      }

      const globalStylesheetBundlingResult =
        tsCompileResult.stylesheetBundlingResultMap.get(emitFile);
      if (globalStylesheetBundlingResult && "outputFiles" in globalStylesheetBundlingResult) {
        for (const outputFile of globalStylesheetBundlingResult.outputFiles) {
          const distPath = PathUtils.norm(
            this._opt.pkgPath,
            "dist",
            path.relative(this._opt.pkgPath, outputFile.path),
          );
          if (PathUtils.isChildPath(distPath, path.resolve(this._opt.pkgPath, "dist"))) {
            const prevHash = this._outputHashCache.get(distPath);
            const currHash = HashUtils.get(Buffer.from(outputFile.text));
            if (prevHash !== currHash) {
              FsUtils.writeFile(distPath, outputFile.text);
              this._outputHashCache.set(distPath, currHash);
              emitFileSet.add(distPath);
            }
          }
        }
      }
    }

    const styleResults = Array.from(tsCompileResult.stylesheetBundlingResultMap.values()).mapMany(
      (item) => SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(item, this._opt.pkgPath),
    );

    return {
      buildMessages: [...tsCompileResult.messages, ...styleResults],

      watchFileSet: tsCompileResult.watchFileSet,
      affectedFileSet: tsCompileResult.affectedFileSet,
      emitFileSet,
    };
  }
}
