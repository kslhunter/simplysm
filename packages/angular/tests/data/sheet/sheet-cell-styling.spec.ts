import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { useSheetCellStyling } from "../../../src/data/sheet/useSheetCellStyling";
import type { SdSheetColumnDef } from "../../../src/data/sheet/types";
import type { ExpandItemDef } from "../../../src/core/selection/useExpandingManager";

interface Item {
  name: string;
}

function makeColDef(overrides: Partial<SdSheetColumnDef> = {}): SdSheetColumnDef {
  return {
    key: "name",
    header: "이름",
    headerStyle: undefined,
    tooltip: undefined,
    width: "200px",
    fixed: false,
    hidden: false,
    collapse: false,
    disableSorting: false,
    disableResizing: false,
    ordering: 0,
    ...overrides,
  };
}

function setup(overrides: {
  columnDefs?: SdSheetColumnDef[];
  fixedLeftMap?: Map<number, number>;
  getItemCellStyleFn?: (item: Item, colKey: string) => string | undefined;
  getItemCellClassFn?: (item: Item, colKey: string) => string;
  getChildrenFn?: (item: Item, index: number) => Item[] | undefined;
  expandingDef?: (item: Item) => ExpandItemDef<Item>;
  isCellEditMode?: (addr: { r: number; c: number }) => boolean;
} = {}) {
  const columnDefs = signal(overrides.columnDefs ?? [makeColDef()]);
  const fixedLeftMap = signal(overrides.fixedLeftMap ?? new Map<number, number>());
  const getItemCellStyleFn = signal<((item: Item, colKey: string) => string | undefined) | undefined>(
    overrides.getItemCellStyleFn,
  );
  const getItemCellClassFn = signal<((item: Item, colKey: string) => string) | undefined>(
    overrides.getItemCellClassFn,
  );
  const getChildrenFn = signal<((item: Item, index: number) => Item[] | undefined) | undefined>(
    overrides.getChildrenFn,
  );

  const styling = useSheetCellStyling<Item>({
    columnDefs,
    fixedLeftMap,
    getItemCellStyleFn,
    getItemCellClassFn,
    getChildrenFn,
    expandingDef: overrides.expandingDef ?? ((item) => ({ item, parentDef: undefined, depth: 0, hasChildren: false })),
    isCellEditMode: overrides.isCellEditMode ?? (() => false),
  });

  return { styling, columnDefs, fixedLeftMap };
}

const testItem: Item = { name: "Alice" };

describe("useSheetCellStyling", () => {
  describe("Rule: fixed 컬럼 스타일", () => {
    it("fixed 컬럼 — left offset이 적용된다", () => {
      const fixedMap = new Map([[0, 0]]);
      const { styling } = setup({
        columnDefs: [makeColDef({ key: "name", fixed: true })],
        fixedLeftMap: fixedMap,
      });

      const style = styling.getHeaderCellStyle({
        text: "이름",
        colspan: 1,
        rowspan: 1,
        isLastRow: true,
        colDef: makeColDef({ key: "name", fixed: true }),
        colIndex: 0,
      });

      expect(style).toContain("left: 0px");
    });

    it("getFixedCellStyle — left offset 스타일 반환", () => {
      const fixedMap = new Map([[0, 50]]);
      const { styling } = setup({ fixedLeftMap: fixedMap });

      const style = styling.getFixedCellStyle(0);
      expect(style).toContain("left: 50px");
    });

    it("non-fixed 컬럼 — fixed 스타일이 적용되지 않는다", () => {
      const { styling } = setup();

      const style = styling.getFixedCellStyle(0);
      expect(style).toBeNull();
    });
  });

  describe("Rule: 커스텀 셀 스타일/클래스", () => {
    it("getItemCellStyleFn이 설정되면 기본 스타일과 결합된다", () => {
      const { styling } = setup({
        getItemCellStyleFn: () => "color: red",
      });

      const style = styling.getCellStyle(testItem, makeColDef());
      expect(style).toContain("color: red");
    });

    it("getItemCellClassFn이 설정되면 셀 클래스에 포함된다", () => {
      const { styling } = setup({
        getItemCellClassFn: () => "custom-class",
      });

      const cls = styling.getDataCellClass(testItem, makeColDef(), 0, 0);
      expect(cls).toContain("custom-class");
    });

    it("편집 모드 셀 — _edit-mode 클래스가 추가된다", () => {
      const { styling } = setup({
        isCellEditMode: (addr) => addr.r === 0 && addr.c === 0,
      });

      const cls = styling.getDataCellClass(testItem, makeColDef(), 0, 0);
      expect(cls).toContain("_edit-mode");
    });
  });

  describe("Rule: 트리 인덴트", () => {
    it("트리 모드에서 depth > 0인 아이템은 padding-left가 적용된다", () => {
      const { styling } = setup({
        getChildrenFn: () => undefined,
        expandingDef: (item) => ({ item, parentDef: undefined, depth: 2, hasChildren: false }),
      });

      const style = styling.getCellStyleWithIndent(testItem, makeColDef(), 0);
      expect(style).toContain("padding-left: calc(var(--gap-default) + 2em)");
    });

    it("트리 모드에서 depth 0인 아이템은 인덴트가 없다", () => {
      const { styling } = setup({
        getChildrenFn: () => undefined,
        expandingDef: (item) => ({ item, parentDef: undefined, depth: 0, hasChildren: false }),
      });

      const style = styling.getCellStyleWithIndent(testItem, makeColDef(), 0);
      // No indent padding for depth 0
      expect(style == null || !style.includes("padding-left")).toBe(true);
    });

    it("비-트리 모드에서는 인덴트가 적용되지 않는다", () => {
      const { styling } = setup();

      const style = styling.getCellStyleWithIndent(testItem, makeColDef(), 0);
      expect(style == null || !style.includes("padding-left")).toBe(true);
    });
  });

  describe("Rule: headerStyle이 getHeaderCellStyle에서 기존 스타일과 병합된다", () => {
    it("headerStyle이 기존 width 스타일 뒤에 추가된다", () => {
      const colDef = makeColDef({ headerStyle: "color: red" });
      const { styling } = setup({ columnDefs: [colDef] });

      const style = styling.getHeaderCellStyle({
        text: "이름",
        colspan: 1,
        rowspan: 1,
        isLastRow: true,
        colDef,
        colIndex: 0,
      });

      expect(style).toContain("width: 200px");
      expect(style).toContain("color: red");
    });

    it("headerStyle이 undefined이면 기존 스타일만 반환된다", () => {
      const colDef = makeColDef({ headerStyle: undefined });
      const { styling } = setup({ columnDefs: [colDef] });

      const style = styling.getHeaderCellStyle({
        text: "이름",
        colspan: 1,
        rowspan: 1,
        isLastRow: true,
        colDef,
        colIndex: 0,
      });

      expect(style).toContain("width: 200px");
      expect(style).not.toContain("color");
    });

    it("colDef가 없는 비-leaf 셀은 null을 반환한다", () => {
      const { styling } = setup();

      const style = styling.getHeaderCellStyle({
        text: "그룹",
        colspan: 1,
        rowspan: 1,
        isLastRow: false,
        colDef: undefined,
        colIndex: 0,
      });

      expect(style).toBeNull();
    });
  });

  describe("Rule: collapse 컬럼", () => {
    it("collapse 컬럼 — 너비 0, padding 0 스타일 적용", () => {
      const { styling } = setup({
        columnDefs: [makeColDef({ collapse: true })],
      });

      const style = styling.getHeaderCellStyle({
        text: "이름",
        colspan: 1,
        rowspan: 1,
        isLastRow: true,
        colDef: makeColDef({ collapse: true }),
        colIndex: 0,
      });
      expect(style).toContain("width: 0");
      expect(style).toContain("padding: 0");
    });
  });
});
