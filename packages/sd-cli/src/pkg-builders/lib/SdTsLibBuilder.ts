import path from "path";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";
import { FsUtils, HashUtils, PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { SdTsCompiler } from "../../ts-compiler/SdTsCompiler";
import { ScopePathSet } from "../commons/ScopePathSet";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";

export class SdTsLibBuilder {
  #tsCompiler: SdTsCompiler;
  #outputHashCache = new Map<TNormPath, string>();

  constructor(
    private readonly _pkgPath: TNormPath,
    watch: boolean,
    dev: boolean,
    emitOnly: boolean,
    noEmit: boolean,
    scopePathSet: ScopePathSet,
  ) {
    this.#tsCompiler = new SdTsCompiler({
      pkgPath: this._pkgPath,
      additionalOptions: { declaration: true },
      isWatchMode: watch,
      isDevMode: dev,
      isEmitOnly: emitOnly,
      isNoEmit: noEmit,
      globalStyleFilePath: PathUtils.norm(this._pkgPath, "src/styles.scss"),
      isForBundle: false,
      scopePathSet,
    });
  }

  async buildAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    const tsCompileResult = await this.#tsCompiler.compileAsync(modifiedFileSet ?? new Set());

    const emitFileSet = new Set<TNormPath>();
    for (const emitFile of tsCompileResult.emitFileSet) {
      const emitFileInfos = tsCompileResult.emittedFilesCacheMap.get(emitFile);
      if (emitFileInfos) {
        for (const emitFileInfo of emitFileInfos) {
          if (emitFileInfo.outAbsPath != null) {
            const emitFilePath = PathUtils.norm(emitFileInfo.outAbsPath);
            const prevHash = this.#outputHashCache.get(emitFilePath);
            const currHash = HashUtils.get(Buffer.from(emitFileInfo.text));
            if (prevHash !== currHash) {
              FsUtils.writeFile(emitFilePath, emitFileInfo.text);
              this.#outputHashCache.set(emitFilePath, currHash);
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
            this._pkgPath,
            "dist",
            path.relative(this._pkgPath, outputFile.path),
          );
          if (PathUtils.isChildPath(distPath, path.resolve(this._pkgPath, "dist"))) {
            const prevHash = this.#outputHashCache.get(distPath);
            const currHash = HashUtils.get(Buffer.from(outputFile.text));
            if (prevHash !== currHash) {
              FsUtils.writeFile(distPath, outputFile.text);
              this.#outputHashCache.set(distPath, currHash);
              emitFileSet.add(distPath);
            }
          }
        }
      }
    }

    const styleResults = Array.from(tsCompileResult.stylesheetBundlingResultMap.values()).mapMany(
      (item) => SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(item, this._pkgPath),
    );

    return {
      buildMessages: [...tsCompileResult.messages, ...styleResults],

      watchFileSet: tsCompileResult.watchFileSet,
      affectedFileSet: tsCompileResult.affectedFileSet,
      emitFileSet,
    };
  }
}
