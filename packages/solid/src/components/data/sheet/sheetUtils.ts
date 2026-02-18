import type { DataSheetColumnDef, FlatItem, HeaderDef, SortingDef } from "./types";
import { objGetChainValue } from "@simplysm/core-common";

export function normalizeHeader(header?: string | string[]): string[] {
  if (header == null) return [""];
  if (typeof header === "string") return [header];
  return header;
}

export function buildHeaderTable<TItem>(
  columns: DataSheetColumnDef<TItem>[],
): (HeaderDef | null)[][] {
  if (columns.length === 0) return [];

  const maxDepth = Math.max(...columns.map((c) => c.header.length));
  if (maxDepth === 0) return [];

  // occupied[r][c] = true이면 이미 다른 셀의 병합 영역
  const occupied: boolean[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => false),
  );
  const table: (HeaderDef | null)[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => null),
  );

  // 각 컬럼의 헤더를 maxDepth까지 패딩
  const padded = columns.map((col) => {
    const h = col.header;
    const result: string[] = [];
    for (let d = 0; d < maxDepth; d++) {
      result.push(d < h.length ? h[d] : h[h.length - 1]);
    }
    return result;
  });

  for (let r = 0; r < maxDepth; r++) {
    for (let c = 0; c < columns.length; c++) {
      if (occupied[r][c]) continue;

      const text = padded[c][r];
      // 원본 header 길이 기반으로 판별: 현재 행이 원본 header의 마지막 레벨 이상이면 leaf
      const isLastRow = r >= columns[c].header.length - 1;

      // colspan: 같은 행에서 같은 텍스트 + 같은 상위 그룹 + 고정 경계를 넘지 않음
      let colspan = 1;
      if (!isLastRow) {
        const startFixed = columns[c].fixed;
        while (
          c + colspan < columns.length &&
          !occupied[r][c + colspan] &&
          padded[c + colspan][r] === text &&
          columns[c + colspan].fixed === startFixed &&
          isSameGroup(padded, c, c + colspan, 0, r)
        ) {
          colspan++;
        }
      }

      // rowspan: isLastRow이면 남은 깊이만큼
      const rowspan = isLastRow ? maxDepth - r : 1;

      const col = columns[c];
      table[r][c] = {
        text,
        colspan,
        rowspan,
        isLastRow,
        colIndex: isLastRow ? c : undefined,
        fixed: isLastRow ? col.fixed : undefined,
        width: isLastRow ? col.width : undefined,
        style: isLastRow ? col.headerStyle : undefined,
        headerContent: isLastRow ? col.headerContent : undefined,
      };

      // 병합 영역 마킹
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          occupied[r + dr][c + dc] = true;
        }
      }
    }
  }

  return table;
}

// 같은 병합 그룹에 속하는지 확인 (행 0~endRow까지 같은 텍스트 시퀀스)
function isSameGroup(
  padded: string[][],
  colA: number,
  colB: number,
  startRow: number,
  endRow: number,
): boolean {
  for (let r = startRow; r < endRow; r++) {
    if (padded[colA][r] !== padded[colB][r]) return false;
  }
  return true;
}

export function flattenTree<TNode>(
  items: TNode[],
  expandedItems: TNode[],
  getChildren?: (item: TNode, index: number) => TNode[] | undefined,
): FlatItem<TNode>[] {
  if (!getChildren) {
    return items.map((item, i) => ({
      item,
      index: i,
      depth: 0,
      hasChildren: false,
    }));
  }

  const result: FlatItem<TNode>[] = [];
  let index = 0;

  function walk(list: TNode[], depth: number, parent?: TNode): void {
    for (const item of list) {
      const children = getChildren!(item, index);
      const hasChildren = children != null && children.length > 0;
      result.push({ item, index, depth, hasChildren, parent });
      index++;

      if (hasChildren && expandedItems.includes(item)) {
        walk(children, depth + 1, item);
      }
    }
  }

  walk(items, 0);
  return result;
}

export function collectAllExpandable<TItem>(
  items: TItem[],
  getChildren: (item: TItem, index: number) => TItem[] | undefined,
): TItem[] {
  const result: TItem[] = [];
  let index = 0;

  function walk(list: TItem[]): void {
    for (const item of list) {
      const children = getChildren(item, index);
      index++;
      if (children != null && children.length > 0) {
        result.push(item);
        walk(children);
      }
    }
  }

  walk(items);
  return result;
}

export function applySorting<TItem>(items: TItem[], sorts: SortingDef[]): TItem[] {
  if (sorts.length === 0) return items;

  let result = [...items];
  for (const sort of [...sorts].reverse()) {
    const selector = (item: TItem) =>
      objGetChainValue(item, sort.key) as string | number | undefined;
    result = sort.desc ? result.orderByDesc(selector) : result.orderBy(selector);
  }
  return result;
}
