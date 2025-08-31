import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { TStylesheetBundlingResult } from "../types/ts-compiler.types";
import { ComponentStylesheetBundler } from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";
import { ScopePathSet } from "../pkg-builders/commons/scope-path";

export class SdStyleBundler {
  #ngStyleBundler: ComponentStylesheetBundler;
  #resultCache = new Map<TNormPath, TStylesheetBundlingResult>();
  #refCache = new Map<TNormPath, Set<TNormPath>>();
  #revRefCache = new Map<TNormPath, Set<TNormPath>>();

  constructor(
    private readonly _pkgPath: TNormPath,
    private readonly _isDevMode: boolean,
    private readonly _watchScopePathSet: ScopePathSet,
  ) {
    this.#ngStyleBundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: this._pkgPath,
        optimization: !this._isDevMode,
        inlineFonts: true,
        preserveSymlinks: false,
        sourcemap: this._isDevMode ? "inline" : false,
        outputNames: { bundles: "[name]", media: "media/[name]" },
        includePaths: [],
        externalDependencies: [],
        target: transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"])),
        tailwindConfiguration: undefined,
        cacheOptions: {
          enabled: true,
          path: ".cache/angular",
          basePath: ".cache",
        },
      },
      "scss",
      this._isDevMode,
    );
  }

  getResultCache() {
    return this.#resultCache;
  }

  async bundleAsync(
    data: string,
    containingFile: TNormPath,
    resourceFile: TNormPath | null = null,
  ): Promise<TStylesheetBundlingResult & { cached: boolean }> {
    // containingFile: 포함된 파일 (.ts 혹은 global style.scss)
    // resourceFile: 외부 리소스 파일 (styleUrls로 입력하지 않고 styles에 직접 입력한 경우 null)
    // referencedFiles: import한 외부 scss 파일 혹은 woff파일등 외부 파일

    const fileNPath = PathUtils.norm(resourceFile ?? containingFile);
    if (this.#resultCache.has(fileNPath)) {
      return {
        ...this.#resultCache.get(fileNPath)!,
        cached: true,
      };
    }

    try {
      const result =
        resourceFile != null
          ? await this.#ngStyleBundler.bundleFile(resourceFile)
          : await this.#ngStyleBundler.bundleInline(data, containingFile, "scss");

      for (const referencedFile of result.referencedFiles ?? []) {
        if (
          !this._watchScopePathSet.inScope(fileNPath) ||
          !this._watchScopePathSet.inScope(PathUtils.norm(referencedFile))
        )
          continue;

        // 참조하는 파일과 참조된 파일 사이의 의존성 관계 추가
        this.#addReference(fileNPath, PathUtils.norm(referencedFile));
      }

      this.#resultCache.set(fileNPath, result);

      return { ...result, cached: false };
    } catch (err) {
      const result = {
        errors: [
          {
            text: `스타일 번들링 실패: ${err.message ?? "알 수 없는 오류"}`,
            location: { file: containingFile },
          },
        ],
        warnings: [],
      };
      this.#resultCache.set(fileNPath, result);
      return { ...result, cached: false };
    }
  }

  invalidate(modifiedNPathSet: Set<TNormPath>) {
    const affectedFileSet = this.getAffectedFileSet(modifiedNPathSet);

    this.#ngStyleBundler.invalidate(affectedFileSet);
    for (const fileNPath of affectedFileSet) {
      this.#resultCache.delete(fileNPath);
    }

    // revRefCache/refCache
    const targetSet = new Set<TNormPath>();
    for (const fileNPath of affectedFileSet) {
      targetSet.adds(...(this.#refCache.get(fileNPath) ?? []));
    }

    for (const target of [...targetSet]) {
      const source = this.#revRefCache.get(target);
      if (source == null) continue;

      for (const affectedFile of affectedFileSet) {
        source.delete(affectedFile);
      }
      if (source.size === 0) {
        this.#revRefCache.delete(target);
      }

      this.#refCache.delete(target);
    }

    return affectedFileSet;
  }

  #addReference(fileNPath: TNormPath, referencedFile: TNormPath) {
    this.#refCache.getOrCreate(fileNPath, new Set()).add(referencedFile);
    this.#revRefCache.getOrCreate(referencedFile, new Set()).add(fileNPath);
  }

  getAffectedFileSet(modifiedNPathSet: Set<TNormPath>) {
    const affectedFileSet = new Set<TNormPath>();
    // 수정파일중 Result에 있는것
    const modifiedResultFiles = Array.from(modifiedNPathSet)
      // .filter((item) => item.endsWith(".scss"))
      .filter((item) => this.#resultCache.has(item));
    affectedFileSet.adds(...modifiedResultFiles);

    // 수정파일을 사용하는 파일
    const modifiedScssFiles = Array.from(modifiedNPathSet).filter((item) => item.endsWith(".scss"));
    for (const modifiedScss of modifiedScssFiles) {
      affectedFileSet.adds(...(this.#revRefCache.get(modifiedScss) ?? []));
    }

    return affectedFileSet;
  }
}
