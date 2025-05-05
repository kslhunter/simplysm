import { TNormPath } from "@simplysm/sd-core-node";

export class SdDependencyCache {
  private _exportCache = new Map<
    /* fileNPath: */ TNormPath,
    /* exportSymbolSet: */ Set<string>
  >();

  private _importCache = new Map<
    /* fileNPath: */ TNormPath,
    Map<
      /* targetNPath: */ TNormPath,
      /* targetSymbolSet: */ Set<string> | 0
    >
  >();

  private _reexportCache = new Map<
    /* fileNPath: */ TNormPath,
    Map<
      /* targetNPath: */ TNormPath,
      /* targetSymbolInfos: */ {
      importSymbol: string;
      exportSymbol: string;
    }[] | 0
    >
  >();

  private _revDepCache = new Map<
    /* targetNPath: */ TNormPath,
    Map<
      /* fileNPath: */ TNormPath,
      /* exportSymbolSet: */ Set<string> | 0 // fileNPath입장에선 import, targetNPath입장에선 export
    >
  >();

  private _collectedCache = new Set<TNormPath>();

  getFiles(): Set<TNormPath> {
    return new Set<TNormPath>([
      ...this._collectedCache.keys(),
      ...this._revDepCache.keys(),
    ]);
  }

  addCollected(fileNPath: TNormPath) {
    this._collectedCache.add(fileNPath);
  }

  hasCollected(fileNPath: TNormPath) {
    return this._collectedCache.has(fileNPath);
  }

  // export const ...
  // export function/class/interface A ...
  addExport(fileNPath: TNormPath, exportSymbol: string) {
    const exportSymbolSet = this._exportCache.getOrCreate(fileNPath, new Set());
    exportSymbolSet.add(exportSymbol);
  }

  // import * from "..."
  // import ... from "..."
  // import(...)
  // require(...)
  addImport(fileNPath: TNormPath, targetNPath: TNormPath, targetSymbol: string | 0) {
    const importTargetMap = this._importCache.getOrCreate(fileNPath, new Map());
    if (targetSymbol === 0) {
      importTargetMap.set(targetNPath, 0);
      this._addRevDep(targetNPath, fileNPath, 0);
    }
    else {
      const importTargetSymbolSet = importTargetMap.getOrCreate(targetNPath, new Set());
      if (importTargetSymbolSet === 0) {
        return;
      }

      importTargetSymbolSet.add(targetSymbol);
      this._addRevDep(targetNPath, fileNPath, targetSymbol);
    }
  }

  // export * from '...'
  // export { A as B } from '...'
  //
  // exoprt/import에 자동등록하진 않음.
  // 차후 계산시 모든 캐시가 사용되므로,
  // 이 클래스를 사용하는 곳에서는 따로따로 입력하면됨
  addReexport(
    fileNPath: TNormPath,
    targetNPath: TNormPath,
    targetSymbolInfo: { importSymbol: string, exportSymbol: string } | 0,
  ) {
    const reexportTargetMap = this._reexportCache.getOrCreate(fileNPath, new Map());
    if (targetSymbolInfo === 0) {
      reexportTargetMap.set(targetNPath, 0);
      this._addRevDep(targetNPath, fileNPath, 0);
    }
    else {
      const reexportTargetSymbolInfos = reexportTargetMap.getOrCreate(targetNPath, []);
      if (reexportTargetSymbolInfos === 0) {
        return;
      }

      if (
        !reexportTargetSymbolInfos.some(item =>
          item.importSymbol === targetSymbolInfo.importSymbol &&
          item.exportSymbol === targetSymbolInfo.exportSymbol,
        )
      ) {
        reexportTargetSymbolInfos.push(targetSymbolInfo);
        this._addRevDep(targetNPath, fileNPath, targetSymbolInfo.importSymbol);
      }
    }
  }

  private _addRevDep(targetNPath: TNormPath, fileNPath: TNormPath, exportSymbol: string | 0) {
    const revDepInfoMap = this._revDepCache.getOrCreate(targetNPath, new Map());
    if (exportSymbol === 0) {
      revDepInfoMap.set(fileNPath, exportSymbol);
    }
    else {
      const exportSymbolSet = revDepInfoMap.getOrCreate(fileNPath, new Set());
      if (exportSymbolSet === 0) {
        return;
      }

      exportSymbolSet.add(exportSymbol);
    }
  }

  getAffectedFileSet(modifiedNPathSet: Set<TNormPath>): Set<TNormPath> {
    const visited = new Set<string>();

    const result = new Set<TNormPath>(modifiedNPathSet);

    const queue: { fileNPath: TNormPath, exportSymbol: string | undefined }[] = [];

    const enqueue = (fileNPath: TNormPath, exportSymbol: string | undefined) => {
      const key = `${fileNPath}#${exportSymbol}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ fileNPath, exportSymbol });
      }
    };

    for (const modifiedNPath of modifiedNPathSet) {
      const exportSymbols = this._getExportSymbols(modifiedNPath);
      if (exportSymbols.size === 0) {
        enqueue(modifiedNPath, undefined);
      }
      else {
        for (const symbol of exportSymbols) {
          enqueue(modifiedNPath, symbol);
        }
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;

      /*const key = curr.fileNPath + "#" + curr.exportSymbol;
      if (visited.has(key)) continue;
      visited.add(key);*/

      const revDepInfoMap = this._revDepCache.get(curr.fileNPath);
      if (!revDepInfoMap) continue;

      for (const [revDepFileNPath, revDepInfo] of revDepInfoMap) {
        if (curr.exportSymbol != null) {
          // curr의 export를 토대로 revDep이 사용하고 있는지 체크
          // curr.exportSymbol 와 revDev의 importSymbol은 같다
          const hasImportSymbol = revDepInfo === 0 || revDepInfo.has(curr.exportSymbol);
          if (hasImportSymbol) {
            result.add(revDepFileNPath);

            // 하위 Deps를 queue에 넣기전 export명칭 변환 (이름을 변경한 reexport일 경우 필요)
            const exportSymbol = this._convertImportSymbolToExportSymbol(
              revDepFileNPath,
              curr.fileNPath,
              curr.exportSymbol, // revdep의 importSymbol
            );
            enqueue(revDepFileNPath, exportSymbol);
          }
        }
        else { // Resource
          result.add(revDepFileNPath);
        }
      }
    }

    return result;
  }

  invalidates(fileNPathSet: Set<TNormPath>) {
    const affectedFiles = this.getAffectedFileSet(fileNPathSet);

    for (const fileNPath of affectedFiles) {
      this._exportCache.delete(fileNPath);
      this._importCache.delete(fileNPath);
      this._reexportCache.delete(fileNPath);
      this._collectedCache.delete(fileNPath);
      this._revDepCache.delete(fileNPath); // ← 자기 자신이 key인 경우도 정리
    }

    // _revDepCache는 역방향으로 순회
    for (const [targetNPath, infoMap] of this._revDepCache) {
      for (const fileNPath of affectedFiles) {
        infoMap.delete(fileNPath);
      }

      if (infoMap.size === 0) {
        this._revDepCache.delete(targetNPath);
      }
    }
  }

  private _convertImportSymbolToExportSymbol(
    fileNPath: TNormPath,
    targetNPath: TNormPath,
    importSymbol: string,
  ) {
    const symbolInfos = this._reexportCache.get(fileNPath)?.get(targetNPath);
    if (symbolInfos != null && symbolInfos !== 0 && symbolInfos.length > 0) {
      const symbolInfo = symbolInfos.single(item => item.importSymbol === importSymbol);
      if (symbolInfo) {
        return symbolInfo.exportSymbol;
      }
    }

    return importSymbol;
  }

  private _getExportSymbols(fileNPath: TNormPath): Set<string> {
    const result = new Set<string>();

    const set = this._exportCache.get(fileNPath);
    if (set) {
      result.adds(...set);
    }

    const map = this._reexportCache.get(fileNPath);
    if (map) {
      for (const [key, val] of map) {
        if (val === 0) {
          result.adds(...this._getExportSymbols(key));
        }
        else {
          result.adds(...val.map(item => item.exportSymbol));
        }
      }
    }

    return result;
  }

  // ---

  getAffectedFileTree(modifiedNPathSet: Set<TNormPath>): ISdAffectedFileTreeNode[] {
    const visited = new Set<string>(); // 순환 방지용: file#symbol
    const nodeMap = new Map<string, ISdAffectedFileTreeNode>(); // 중복 노드 캐시

    const buildTree = (
      fileNPath: TNormPath,
      exportSymbol: string | undefined
    ): ISdAffectedFileTreeNode => {
      const key = `${fileNPath}#${exportSymbol ?? "*"}`;

      // 동일 노드가 이미 만들어졌다면 재사용
      if (nodeMap.has(key)) return nodeMap.get(key)!;

      // 방문 기록
      visited.add(key);

      // 노드 생성 및 캐싱
      const node: ISdAffectedFileTreeNode = {
        fileNPath,
        children: []
      };
      nodeMap.set(key, node);

      const revDepInfoMap = this._revDepCache.get(fileNPath);
      if (!revDepInfoMap) return node;

      for (const [revDepFileNPath, revDepInfo] of revDepInfoMap.entries()) {
        const hasImportSymbol =
          exportSymbol == null || revDepInfo === 0 || revDepInfo.has(exportSymbol);
        if (!hasImportSymbol) continue;

        const nextExportSymbol = exportSymbol != null
          ? this._convertImportSymbolToExportSymbol(
            revDepFileNPath,
            fileNPath,
            exportSymbol
          )
          : undefined;

        const childKey = `${revDepFileNPath}#${nextExportSymbol ?? "*"}`;
        if (visited.has(childKey)) continue; // 순환 방지

        const childNode = buildTree(revDepFileNPath, nextExportSymbol);
        node.children.push(childNode);
      }

      return node;
    };

    const result: ISdAffectedFileTreeNode[] = [];

    for (const modifiedNPath of modifiedNPathSet) {
      const exportSymbols = this._getExportSymbols(modifiedNPath);
      if (exportSymbols.size === 0) {
        const rootNode = buildTree(modifiedNPath, undefined);
        result.push(rootNode);
      } else {
        for (const symbol of exportSymbols) {
          const rootNode = buildTree(modifiedNPath, symbol);
          result.push(rootNode);
        }
      }
    }

    return result;
  }
}

export interface ISdAffectedFileTreeNode {
  fileNPath: TNormPath;
  children: ISdAffectedFileTreeNode[];
}