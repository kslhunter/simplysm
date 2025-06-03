import path from "path";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { FsUtils, HashUtils, PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { ISdBuildMessage } from "../../types/build.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";
import { ScopePathSet } from "../commons/scope-path";

export class SdTsLibBuilder {
  #tsCompiler: SdTsCompiler;
  #outputHashCache = new Map<TNormPath, string>();

  constructor(
    private readonly _pkgPath: TNormPath,
    dev: boolean,
    watchScopePathSet: ScopePathSet,
  ) {
    this.#tsCompiler = new SdTsCompiler({
      pkgPath: this._pkgPath,
      additionalOptions: { declaration: true },
      isDevMode: dev,
      globalStyleFilePath: PathUtils.norm(this._pkgPath, "src/styles.scss"),
      isForBundle: false,
      watchScopePathSet,
    });
  }

  async buildAsync(modifiedFileSet: Set<TNormPath>): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    results: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    const tsCompileResult = await this.#tsCompiler.compileAsync(modifiedFileSet);

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
      watchFileSet: tsCompileResult.watchFileSet,
      affectedFileSet: tsCompileResult.affectedFileSet,
      results: [...tsCompileResult.messages, ...styleResults],
      emitFileSet,
    };
  }
}
