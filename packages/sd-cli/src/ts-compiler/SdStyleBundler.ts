import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { ComponentStylesheetBundler } from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";
import { TStylesheetBundlingResult } from "../types/build/TStylesheetBundlingResult";
import { ScopePathSet } from "./ScopePathSet";
import path from "path";

export class SdStyleBundler {
  private readonly _ngStyleBundler: ComponentStylesheetBundler;
  private readonly _resultCache = new Map<TNormPath, TStylesheetBundlingResult>();
  private readonly _refCache = new Map<TNormPath, Set<TNormPath>>();
  private readonly _revRefCache = new Map<TNormPath, Set<TNormPath>>();

  constructor(
    private readonly _opt: {
      pkgPath: TNormPath;
      scopePathSet: ScopePathSet;
      dev: boolean;
    },
  ) {
    this._ngStyleBundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: this._opt.pkgPath,
        inlineFonts: !this._opt.dev,
        optimization: !this._opt.dev,
        sourcemap: this._opt.dev ? "inline" : false,
        sourcesContent: this._opt.dev,
        outputNames: { bundles: "[name]-[hash]", media: "media/[name]-[hash]" },
        includePaths: [],
        sass: {
          fatalDeprecations: undefined,
          silenceDeprecations: undefined,
          futureDeprecations: undefined,
        },
        externalDependencies: [],
        target: transformSupportedBrowsersToTargets(browserslist(["Chrome > 61"])),
        preserveSymlinks: false,
        tailwindConfiguration: undefined,
        postcssConfiguration: undefined,
        cacheOptions: {
          enabled: true,
          basePath: path.resolve(this._opt.pkgPath, ".cache"),
          path: path.resolve(this._opt.pkgPath, ".cache/angular"),
        },
        publicPath: undefined,
      },
      "scss",
      this._opt.dev,
    );
  }

  getResultCache() {
    return this._resultCache;
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
    if (this._resultCache.has(fileNPath)) {
      return {
        ...this._resultCache.get(fileNPath)!,
        cached: true,
      };
    }

    try {
      const result =
        resourceFile != null
          ? await this._ngStyleBundler.bundleFile(resourceFile)
          : await this._ngStyleBundler.bundleInline(data, containingFile, "scss");

      for (const referencedFile of result.referencedFiles ?? []) {
        if (
          !this._opt.scopePathSet.inScope(fileNPath) ||
          !this._opt.scopePathSet.inScope(PathUtils.norm(referencedFile))
        )
          continue;

        // 참조하는 파일과 참조된 파일 사이의 의존성 관계 추가
        this._addReference(fileNPath, PathUtils.norm(referencedFile));
      }

      this._resultCache.set(fileNPath, result);

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
      this._resultCache.set(fileNPath, result);
      return { ...result, cached: false };
    }
  }

  invalidate(modifiedNPathSet: Set<TNormPath>) {
    const affectedFileSet = this.getAffectedFileSet(modifiedNPathSet);

    this._ngStyleBundler.invalidate(affectedFileSet);
    for (const fileNPath of affectedFileSet) {
      this._resultCache.delete(fileNPath);
    }

    // revRefCache/refCache
    const targetSet = new Set<TNormPath>();
    for (const fileNPath of affectedFileSet) {
      targetSet.adds(...(this._refCache.get(fileNPath) ?? []));
    }

    for (const target of [...targetSet]) {
      const source = this._revRefCache.get(target);
      if (source == null) continue;

      for (const affectedFile of affectedFileSet) {
        source.delete(affectedFile);
      }
      if (source.size === 0) {
        this._revRefCache.delete(target);
      }

      this._refCache.delete(target);
    }

    return affectedFileSet;
  }

  private _addReference(fileNPath: TNormPath, referencedFile: TNormPath) {
    if (fileNPath === referencedFile) return;
    this._refCache.getOrCreate(fileNPath, new Set()).add(referencedFile);
    this._revRefCache.getOrCreate(referencedFile, new Set()).add(fileNPath);
  }

  getAllStyleFileSet() {
    return new Set([
      ...this._revRefCache.keys(),
      ...Array.from(this._revRefCache.values()).mapMany((item) => Array.from(item)),
    ]);
  }

  getAffectedFileSet(modifiedNPathSet: Set<TNormPath>) {
    const affectedFileSet = new Set<TNormPath>();
    // 수정파일중 Result에 있는것
    const modifiedResultFiles = Array.from(modifiedNPathSet)
      // .filter((item) => item.endsWith(".scss"))
      .filter((item) => this._resultCache.has(item));
    affectedFileSet.adds(...modifiedResultFiles);

    // 수정파일을 사용하는 파일
    const modifiedScssFiles = Array.from(modifiedNPathSet).filter((item) => item.endsWith(".scss"));
    for (const modifiedScss of modifiedScssFiles) {
      affectedFileSet.adds(...(this._revRefCache.get(modifiedScss) ?? []));
    }

    return affectedFileSet;
  }
}
