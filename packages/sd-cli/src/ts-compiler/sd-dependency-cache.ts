import { TNormPath } from "@simplysm/sd-core-node";

export class SdDependencyCache {
  /**
   * 각 파일이 export한 심볼 집합 (예: export const A → "A")
   */
  private _exportCache = new Map<TNormPath, Set<string>>();

  /**
   * import한 타겟과 그 심볼 정보
   * - 값이 0이면 전체 import(import * 또는 리소스 import)
   * - 값이 Set이면 선택적 심볼 import (예: import { A } ...)
   */
  private _importCache = new Map<TNormPath, Map<TNormPath, Set<string> | 0>>();

  /**
   * re-export한 타겟과 그 심볼 정보
   * - export * from ...
   * - export { A as B } from ...
   * - 값이 0이면 전체 reexport(export * from ...)
   */
  private _reexportCache = new Map<
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
  private _revDepCache = new Map<TNormPath, Map<TNormPath, Set<string> | 0>>();

  /**
   * 분석이 완료된 파일 경로
   */
  private _collectedCache = new Set<TNormPath>();

  private _exportSymbolCache = new Map<TNormPath, Set<string>>();

  /**
   * .d.ts 또는 .js가 입력되었을 때 쌍으로 존재하는 파일 경로를 반환
   * 예: "/a.d.ts" → ["/a.d.ts", "/a.js"]
   */
  #getRelatedNPaths(nPath: TNormPath): TNormPath[] {
    if (nPath.endsWith(".d.ts")) {
      return [nPath, nPath.replace(/\.d\.ts$/, ".js") as TNormPath];
    }
    if (nPath.endsWith(".js")) {
      return [nPath, nPath.replace(/\.js$/, ".d.ts") as TNormPath];
    }
    return [nPath];
  }

  /**
   * 전체 추적된 파일 경로를 반환
   */
  getFiles(): Set<TNormPath> {
    return new Set<TNormPath>([...this._collectedCache.keys(), ...this._revDepCache.keys()]);
  }

  /**
   * 분석이 완료된 파일로 표시
   */
  addCollected(fileNPath: TNormPath) {
    for (const path of this.#getRelatedNPaths(fileNPath)) {
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
    for (const path of this.#getRelatedNPaths(fileNPath)) {
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
    for (const filePath of this.#getRelatedNPaths(fileNPath)) {
      for (const targetPath of this.#getRelatedNPaths(targetNPath)) {
        const importTargetMap = this._importCache.getOrCreate(filePath, new Map());

        if (targetSymbol === 0) {
          importTargetMap.set(targetPath, 0);
          this.#addRevDep(targetPath, filePath, 0);
        } else {
          const importTargetSymbolSet = importTargetMap.getOrCreate(targetPath, new Set());
          if (importTargetSymbolSet === 0) return;

          importTargetSymbolSet.add(targetSymbol);
          this.#addRevDep(targetPath, filePath, targetSymbol);
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
    for (const filePath of this.#getRelatedNPaths(fileNPath)) {
      for (const targetPath of this.#getRelatedNPaths(targetNPath)) {
        const reexportTargetMap = this._reexportCache.getOrCreate(filePath, new Map());

        if (targetSymbolInfo === 0) {
          reexportTargetMap.set(targetPath, 0);
          this.#addRevDep(targetPath, filePath, 0);
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
            this.#addRevDep(targetPath, filePath, targetSymbolInfo.importSymbol);
          }
        }
      }
    }
  }

  /**
   * 역의존 관계 등록 (revDep)
   */
  #addRevDep(targetNPath: TNormPath, fileNPath: TNormPath, exportSymbol: string | 0) {
    for (const targetPath of this.#getRelatedNPaths(targetNPath)) {
      for (const filePath of this.#getRelatedNPaths(fileNPath)) {
        const revDepInfoMap = this._revDepCache.getOrCreate(targetPath, new Map());
        if (exportSymbol === 0) {
          revDepInfoMap.set(filePath, 0);
        } else {
          const exportSymbolSet = revDepInfoMap.getOrCreate(filePath, new Set());
          if (exportSymbolSet === 0) return;

          exportSymbolSet.add(exportSymbol);
        }
      }
    }
  }

  /**
   * 변경된 파일 경로 집합으로부터 영향을 받는 전체 파일 집합을 계산
   */
  /*getAffectedFileSet(modifiedNPathSet: Set<TNormPath>): Set<TNormPath> {
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

    for (const modifiedNPath of modifiedNPathSet) {
      for (const path of this.#getRelatedNPaths(modifiedNPath)) {
        result.add(path);
        const exportSymbols = this.#getExportSymbols(path);
        if (exportSymbols.size === 0) {
          enqueue(path, undefined);
        } else {
          for (const symbol of exportSymbols) {
            enqueue(path, symbol);
          }
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
            const exportSymbol = this.#convertImportSymbolToExportSymbol(
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

    return result;
  }*/
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

      for (const path of this.#getRelatedNPaths(modifiedNPath)) {
        result.add(path);
        const exportSymbols = this.#getExportSymbols(path);
        if (exportSymbols.size === 0) {
          enqueue(path, undefined);
        } else {
          for (const symbol of exportSymbols) {
            enqueue(path, symbol);
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
              const exportSymbol = this.#convertImportSymbolToExportSymbol(
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
    // const affectedFileMap = this.getAffectedFileMap(fileNPathSet);

    for (const fileNPath of fileNPathSet) {
      this._exportCache.delete(fileNPath);
      this._importCache.delete(fileNPath);
      this._reexportCache.delete(fileNPath);
      this._collectedCache.delete(fileNPath);
      this._revDepCache.delete(fileNPath); // 자신이 key인 경우
      this._exportSymbolCache.delete(fileNPath);
    }

    for (const [targetNPath, infoMap] of this._revDepCache) {
      for (const fileNPath of fileNPathSet) {
        infoMap.delete(fileNPath);
      }
      if (infoMap.size === 0) {
        this._revDepCache.delete(targetNPath);
      }
    }
  }

  /**
   * reexport된 경우 importSymbol → exportSymbol로 변환
   */
  #convertImportSymbolToExportSymbol(fileNPath: TNormPath, targetNPath: TNormPath, importSymbol: string) {
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
  #getExportSymbols(fileNPath: TNormPath): Set<string> {
    if (this._exportSymbolCache.has(fileNPath)) {
      return this._exportSymbolCache.get(fileNPath)!;
    }

    const result = new Set<string>();

    for (const path of this.#getRelatedNPaths(fileNPath)) {
      const set = this._exportCache.get(path);
      if (set) result.adds(...set);

      const map = this._reexportCache.get(path);
      if (map) {
        for (const [key, val] of map) {
          if (val === 0) {
            result.adds(...this.#getExportSymbols(key));
          } else {
            result.adds(...val.map((item) => item.exportSymbol));
          }
        }
      }
    }

    this._exportSymbolCache.set(fileNPath, result);
    return result;
  }

  /**
   * 변경된 파일로부터 영향을 받는 전체 트리를 반환
   * - 의존 관계를 시각화 및 구조적으로 추적할 수 있도록 트리 형태로 구성
   */
  getAffectedFileTree(modifiedNPathSet: Set<TNormPath>): ISdAffectedFileTreeNode[] {
    const visited = new Set<string>();
    const nodeMap = new Map<string, ISdAffectedFileTreeNode>();

    const buildTree = (fileNPath: TNormPath, exportSymbol: string | undefined): ISdAffectedFileTreeNode => {
      const key = `${fileNPath}#${exportSymbol ?? "*"}`;
      if (nodeMap.has(key)) return nodeMap.get(key)!;

      visited.add(key);

      const node: ISdAffectedFileTreeNode = {
        fileNPath,
        children: [],
      };
      nodeMap.set(key, node);

      const revDepInfoMap = this._revDepCache.get(fileNPath);
      if (!revDepInfoMap) return node;

      for (const [revDepFileNPath, revDepInfo] of revDepInfoMap.entries()) {
        const hasImportSymbol = exportSymbol == null || revDepInfo === 0 || revDepInfo.has(exportSymbol);
        if (!hasImportSymbol) continue;

        const nextExportSymbol =
          exportSymbol != null
            ? this.#convertImportSymbolToExportSymbol(revDepFileNPath, fileNPath, exportSymbol)
            : undefined;

        const childKey = `${revDepFileNPath}#${nextExportSymbol ?? "*"}`;
        if (visited.has(childKey)) continue;

        const childNode = buildTree(revDepFileNPath, nextExportSymbol);
        node.children.push(childNode);
      }

      return node;
    };

    const result: ISdAffectedFileTreeNode[] = [];

    for (const modifiedNPath of modifiedNPathSet) {
      for (const path of this.#getRelatedNPaths(modifiedNPath)) {
        result.push(buildTree(path, undefined)); // root는 symbol상관없이
        /*const exportSymbols = this.#getExportSymbols(path);
        if (exportSymbols.size === 0) {
          result.push(buildTree(path, undefined));
        } else {
          for (const symbol of exportSymbols) {
            result.push(buildTree(path, symbol));
          }
        }*/
      }
    }

    return result;
  }
}

export interface ISdAffectedFileTreeNode {
  fileNPath: TNormPath;
  children: ISdAffectedFileTreeNode[];
}
