import type { TNormPath } from "@simplysm/sd-core-node";

export class SdDepCache {
  /**
   * 각 파일이 export한 심볼 집합 (예: export const A → "A")
   */
  private readonly _exportCache = new Map<TNormPath, Set<string>>();

  /**
   * import한 타겟과 그 심볼 정보
   * - 값이 0이면 전체 import(import * 또는 리소스 import)
   * - 값이 Set이면 선택적 심볼 import (예: import { A } ...)
   */
  private readonly _importCache = new Map<TNormPath, Map<TNormPath, Set<string> | 0>>();

  /**
   * re-export한 타겟과 그 심볼 정보
   * - export * from ...
   * - export { A as B } from ...
   * - 값이 0이면 전체 reexport(export * from ...)
   */
  private readonly _reexportCache = new Map<
    TNormPath,
    Map<
      TNormPath,
      | {
          importSymbol: string;
          exportSymbol: string;
        }[]
      | 0
    >
  >();

  /**
   * 역의존 정보 (revDep)
   * - 특정 파일이 어떤 파일에게 의존(참조)되는지
   * - symbol 기반 추적
   */
  private readonly _revDepCache = new Map<TNormPath, Map<TNormPath, Set<string> | 0>>();

  /**
   * 분석이 완료된 파일 경로
   */
  private readonly _collectedCache = new Set<TNormPath>();

  private readonly _exportSymbolCache = new Map<TNormPath, Set<string>>();

  /**
   * .d.ts 또는 .js가 입력되었을 때 쌍으로 존재하는 파일 경로를 반환
   * 예: "/a.d.ts" → ["/a.d.ts", "/a.js"]
   */
  private _getRelatedNPaths(nPath: TNormPath): TNormPath[] {
    if (nPath.endsWith(".d.ts")) {
      return [nPath, nPath.replace(/\.d\.ts$/, ".js") as TNormPath];
    }
    if (nPath.endsWith(".js")) {
      return [nPath, nPath.replace(/\.js$/, ".d.ts") as TNormPath];
    }
    return [nPath];
  }

  /**
   * 분석이 완료된 파일로 표시
   */
  addCollected(fileNPath: TNormPath) {
    for (const path of this._getRelatedNPaths(fileNPath)) {
      this._collectedCache.add(path);
    }
  }

  hasCollected(fileNPath: TNormPath) {
    return this._collectedCache.has(fileNPath);
  }

  /**
   * export한 심볼 등록
   * 예: export const A → "A"
   */
  addExport(fileNPath: TNormPath, exportSymbol: string) {
    for (const path of this._getRelatedNPaths(fileNPath)) {
      const exportSymbolSet = this._exportCache.getOrCreate(path, new Set());
      exportSymbolSet.add(exportSymbol);
    }
  }

  /**
   * import 구문 등록
   * - import * from ... → symbol = 0
   * - import { A } from ... → symbol = "A"
   */
  addImport(fileNPath: TNormPath, targetNPath: TNormPath, targetSymbol: string | 0) {
    for (const filePath of this._getRelatedNPaths(fileNPath)) {
      const importTargetMap = this._importCache.getOrCreate(filePath, new Map());

      for (const targetPath of this._getRelatedNPaths(targetNPath)) {
        if (typeof targetSymbol === "string") {
          const importTargetSymbolSet = importTargetMap.getOrCreate(targetPath, new Set());
          if (!(importTargetSymbolSet instanceof Set)) continue;

          importTargetSymbolSet.add(targetSymbol);
          this._addRevDep(targetPath, filePath, targetSymbol);
        } else {
          importTargetMap.set(targetPath, targetSymbol);
          this._addRevDep(targetPath, filePath, targetSymbol);
        }
      }
    }
  }

  /**
   * export * or export { A as B } from ... 구문 등록
   * ※ export/import에 자동 등록되지 않으므로 외부에서 명시적으로 따로 입력해야 함
   */
  addReexport(
    fileNPath: TNormPath,
    targetNPath: TNormPath,
    targetSymbolInfo:
      | {
          importSymbol: string;
          exportSymbol: string;
        }
      | 0,
  ) {
    for (const filePath of this._getRelatedNPaths(fileNPath)) {
      const reexportTargetMap = this._reexportCache.getOrCreate(filePath, new Map());

      for (const targetPath of this._getRelatedNPaths(targetNPath)) {
        if (targetSymbolInfo === 0) {
          reexportTargetMap.set(targetPath, 0);
          this._addRevDep(targetPath, filePath, 0);
        } else {
          const reexportTargetSymbolInfos = reexportTargetMap.getOrCreate(targetPath, []);
          if (reexportTargetSymbolInfos === 0) return;

          if (
            !reexportTargetSymbolInfos.some(
              (item) =>
                item.importSymbol === targetSymbolInfo.importSymbol &&
                item.exportSymbol === targetSymbolInfo.exportSymbol,
            )
          ) {
            reexportTargetSymbolInfos.push(targetSymbolInfo);
            this._addRevDep(targetPath, filePath, targetSymbolInfo.importSymbol);
          }
        }
      }
    }
  }

  /**
   * 역의존 관계 등록 (revDep)
   */
  private _addRevDep(targetNPath: TNormPath, fileNPath: TNormPath, exportSymbol: string | 0) {
    for (const targetPath of this._getRelatedNPaths(targetNPath)) {
      const revDepInfoMap = this._revDepCache.getOrCreate(targetPath, new Map());

      for (const filePath of this._getRelatedNPaths(fileNPath)) {
        if (typeof exportSymbol === "string") {
          const exportSymbolSet = revDepInfoMap.getOrCreate(filePath, new Set());
          if (!(exportSymbolSet instanceof Set)) continue;

          exportSymbolSet.add(exportSymbol);
        } else {
          revDepInfoMap.set(filePath, exportSymbol);
        }
      }
    }
  }

  getAffectedFileMap(modifiedNPathSet: Set<TNormPath>): Map<TNormPath, Set<TNormPath>> {
    const resultMap = new Map<TNormPath, Set<TNormPath>>();

    for (const modifiedNPath of modifiedNPathSet) {
      const visited = new Set<string>();
      const result = new Set<TNormPath>();
      const queue: { fileNPath: TNormPath; exportSymbol: string | undefined }[] = [];

      const enqueue = (fileNPath: TNormPath, exportSymbol: string | undefined) => {
        const key = `${fileNPath}#${exportSymbol}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ fileNPath, exportSymbol });
        }
      };

      for (const relatedNPath of this._getRelatedNPaths(modifiedNPath)) {
        result.add(relatedNPath);
        const exportSymbols = this._getExportSymbols(relatedNPath);
        if (exportSymbols.size === 0) {
          enqueue(relatedNPath, undefined);
        } else {
          for (const symbol of exportSymbols) {
            enqueue(relatedNPath, symbol);
          }
        }
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const revDepInfoMap = this._revDepCache.get(curr.fileNPath);
        if (!revDepInfoMap) continue;

        for (const [revDepFileNPath, revDepInfo] of revDepInfoMap) {
          if (curr.exportSymbol != null) {
            const hasImportSymbol = revDepInfo === 0 || revDepInfo.has(curr.exportSymbol);
            if (hasImportSymbol) {
              result.add(revDepFileNPath);
              const exportSymbol = this._convertImportSymbolToExportSymbol(
                revDepFileNPath,
                curr.fileNPath,
                curr.exportSymbol,
              );
              enqueue(revDepFileNPath, exportSymbol);
            }
          } else {
            result.add(revDepFileNPath);
          }
        }
      }

      resultMap.set(modifiedNPath, result);
    }

    return resultMap;
  }

  /**
   * 주어진 파일들 및 그 영향 범위에 해당하는 모든 캐시를 무효화
   */
  invalidates(fileNPathSet: Set<TNormPath>) {
    // const revDepCacheChanged = new Set<TNormPath>();

    for (const fileNPath of fileNPathSet) {
      this._exportCache.delete(fileNPath);
      this._importCache.delete(fileNPath);
      this._reexportCache.delete(fileNPath);
      this._exportSymbolCache.delete(fileNPath);
      this._collectedCache.delete(fileNPath);

      // if (this.#revDepCache.has(fileNPath)) {
      //   this.#revDepCache.delete(fileNPath); // 자신이 key인 경우
      // revDepCacheChanged.add(fileNPath);
      // }
    }

    for (const [targetNPath, infoMap] of this._revDepCache) {
      for (const fileNPath of fileNPathSet) {
        if (infoMap.has(fileNPath)) {
          infoMap.delete(fileNPath);
          // revDepCacheChanged.add(targetNPath);
        }
      }
      if (infoMap.size === 0) {
        this._revDepCache.delete(targetNPath);
      }
    }
  }

  /**
   * reexport된 경우 importSymbol → exportSymbol로 변환
   */
  private _convertImportSymbolToExportSymbol(
    fileNPath: TNormPath,
    targetNPath: TNormPath,
    importSymbol: string,
  ) {
    const symbolInfos = this._reexportCache.get(fileNPath)?.get(targetNPath);
    if (symbolInfos != null && symbolInfos !== 0 && symbolInfos.length > 0) {
      const symbolInfo = symbolInfos.single((item) => item.importSymbol === importSymbol);
      if (symbolInfo) return symbolInfo.exportSymbol;
    }
    return importSymbol;
  }

  /**
   * 해당 파일에서 export된 모든 심볼 (직접 + 재export 포함)
   */
  private _getExportSymbols(fileNPath: TNormPath): Set<string> {
    if (this._exportSymbolCache.has(fileNPath)) {
      return this._exportSymbolCache.get(fileNPath)!;
    }

    const result = new Set<string>();

    for (const path of this._getRelatedNPaths(fileNPath)) {
      const set = this._exportCache.get(path);
      if (set) result.adds(...set);

      const map = this._reexportCache.get(path);
      if (map) {
        for (const [key, val] of map) {
          if (val === 0) {
            result.adds(...this._getExportSymbols(key));
          } else {
            result.adds(...val.map((item) => item.exportSymbol));
          }
        }
      }
    }

    this._exportSymbolCache.set(fileNPath, result);
    return result;
  }
}
