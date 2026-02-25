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

  // occupied[r][c] = true indicates already merged area of another cell
  const occupied: boolean[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => false),
  );
  const table: (HeaderDef | null)[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => null),
  );

  // Pad header of each column to maxDepth
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
      // Determined based on original header length: if current row is at or beyond the last level of original header, it's a leaf
      const isLastRow = r >= columns[c].header.length - 1;

      // colspan: same text in same row + same parent group + does not cross fixed boundary
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

      // rowspan: if isLastRow, span the remaining depth
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

      // Mark merged area
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

// Check if belongs to same merge group (same text sequence from row 0 to endRow)
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
  getOriginalIndex?: (item: TNode) => number,
): FlatItem<TNode>[] {
  if (!getChildren) {
    return items.map((item, i) => ({
      item,
      index: getOriginalIndex ? getOriginalIndex(item) : i,
      row: i,
      depth: 0,
      hasChildren: false,
    }));
  }

  const result: FlatItem<TNode>[] = [];
  let row = 0;

  function walk(list: TNode[], depth: number, parent?: TNode): void {
    for (let localIdx = 0; localIdx < list.length; localIdx++) {
      const item = list[localIdx];
      const index = depth === 0 && getOriginalIndex ? getOriginalIndex(item) : localIdx;
      const children = getChildren!(item, index);
      const hasChildren = children != null && children.length > 0;
      result.push({ item, index, row, depth, hasChildren, parent });
      row++;

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
  getOriginalIndex?: (item: TItem) => number,
): TItem[] {
  const result: TItem[] = [];

  function walk(list: TItem[], depth: number): void {
    for (let localIdx = 0; localIdx < list.length; localIdx++) {
      const item = list[localIdx];
      const index = depth === 0 && getOriginalIndex ? getOriginalIndex(item) : localIdx;
      const children = getChildren(item, index);
      if (children != null && children.length > 0) {
        result.push(item);
        walk(children, depth + 1);
      }
    }
  }

  walk(items, 0);
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
