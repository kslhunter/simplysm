import { Component, signal } from "@angular/core";
import { SdSheet } from "../../../src/data/sheet/sd-sheet";
import { SdSheetColumn } from "../../../src/data/sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";
import type { SortingDef } from "../../../src/core/selection/useSortingManager";

// --- Common test interface ---

export interface TestItem {
  name: string;
  age: number;
}

export interface TestItem3 {
  name: string;
  age: number;
  city: string;
}

// --- Slice 1: 기본 렌더링 fixtures ---

@Component({
  selector: "sd-sheet-basic-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetBasicTest {
  items = signal<TestItem[]>([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
}

@Component({
  selector: "sd-sheet-multi-header-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'col1'" [header]="['그룹A', '세부1']" [width]="'100px'">
        <ng-template [cell]="items()">cell1</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'col2'" [header]="['그룹A', '세부2']" [width]="'100px'">
        <ng-template [cell]="items()">cell2</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetMultiHeaderTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-summary-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">cell</ng-template>
        <ng-template #summaryTpl>합계</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSummaryTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-hidden-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'" [hidden]="true">
        <ng-template [cell]="items()">age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetHiddenTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-collapse-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'" [collapse]="true">
        <ng-template [cell]="items()">age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetCollapseTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-empty-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetEmptyTest {
  items = signal<TestItem[]>([]);
}

@Component({
  selector: "sd-sheet-cell-style-test",
  template: `
    <sd-sheet
      [items]="items()"
      [getItemCellClassFn]="getClassFn"
      [getItemCellStyleFn]="getStyleFn"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetCellStyleTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
  getClassFn = (_item: TestItem, _colKey: string) => "custom-class";
  getStyleFn = (_item: TestItem, _colKey: string) => "color: red";
}

@Component({
  selector: "sd-sheet-inset-test",
  template: `
    <sd-sheet [items]="items()" [inset]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetInsetTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

// --- Slice: 헤더 기능 fixtures (headerStyle, tooltip, headerTplRef) ---

@Component({
  selector: "sd-sheet-header-style-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [headerStyle]="'color: red; font-weight: bold'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetHeaderStyleTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-header-style-with-width-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [headerStyle]="'color: red'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetHeaderStyleWithWidthTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-tooltip-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [tooltip]="'이 컬럼은 수량입니다'">
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetTooltipTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-header-tpl-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #headerTpl><em class="custom-header">커스텀 헤더</em></ng-template>
        <ng-template [cell]="items()">cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetHeaderTplTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

// --- Slice: 셀 템플릿 타입 안전성 fixtures (Feature 3.1) ---

@Component({
  selector: "sd-cell-tpl-render-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetCellTplRenderTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-cell-tpl-context-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-item="item" let-idx="index" let-d="depth" let-e="edit">
          <span class="ctx-item">{{ item.name }}</span>
          <span class="ctx-index">{{ idx }}</span>
          <span class="ctx-depth">{{ d }}</span>
          <span class="ctx-edit">{{ e }}</span>
        </ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetCellTplContextTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-cell-tpl-multi-col-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-item="item">name:{{ item.name }}</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'">
        <ng-template [cell]="items()" let-item="item">age:{{ item.age }}</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetCellTplMultiColTest {
  items = signal<TestItem[]>([{ name: "Alice", age: 30 }]);
}

// --- Slice 2: 컬럼 고정 fixtures ---

@Component({
  selector: "sd-sheet-fixed-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'100px'" [fixed]="true">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'150px'" [fixed]="true">
        <ng-template [cell]="items()">age</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'city'" [header]="'도시'" [width]="'200px'">
        <ng-template [cell]="items()">city</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetFixedTest {
  items = signal<TestItem3[]>([
    { name: "Alice", age: 30, city: "Seoul" },
  ]);
}

@Component({
  selector: "sd-sheet-fixed-3col-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'a'" [header]="'A'" [width]="'100px'" [fixed]="true">
        <ng-template [cell]="items()">a</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'b'" [header]="'B'" [width]="'150px'" [fixed]="true">
        <ng-template [cell]="items()">b</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'c'" [header]="'C'" [width]="'200px'" [fixed]="true">
        <ng-template [cell]="items()">c</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'d'" [header]="'D'" [width]="'300px'">
        <ng-template [cell]="items()">d</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetFixed3ColTest {
  items = signal<TestItem3[]>([
    { name: "Alice", age: 30, city: "Seoul" },
  ]);
}

// --- Slice 3: 행 선택 fixtures ---

@Component({
  selector: "sd-sheet-select-single-test",
  template: `
    <sd-sheet [items]="items()" [selectMode]="'single'" [(selectedItems)]="selectedItems">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSelectSingleTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<TestItem[]>([]);
}

@Component({
  selector: "sd-sheet-select-multi-test",
  template: `
    <sd-sheet [items]="items()" [selectMode]="'multi'" [(selectedItems)]="selectedItems">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSelectMultiTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<TestItem[]>([]);
}

@Component({
  selector: "sd-sheet-select-disabled-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'multi'"
      [(selectedItems)]="selectedItems"
      [getItemSelectableFn]="selectableFn"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSelectDisabledTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<TestItem[]>([]);
  selectableFn = (item: TestItem): boolean | string => {
    if (item.name === "C") return "권한 없음";
    return true;
  };
}

@Component({
  selector: "sd-sheet-no-select-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetNoSelectTest {
  items = signal<TestItem[]>([{ name: "A", age: 1 }]);
}

@Component({
  selector: "sd-sheet-auto-select-click-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'single'"
      [autoSelect]="'click'"
      [(selectedItems)]="selectedItems"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetAutoSelectClickTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
  ]);
  selectedItems = signal<TestItem[]>([]);
}

@Component({
  selector: "sd-sheet-auto-select-focus-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'single'"
      [autoSelect]="'focus'"
      [(selectedItems)]="selectedItems"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetAutoSelectFocusTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
  ]);
  selectedItems = signal<TestItem[]>([]);
}

@Component({
  selector: "sd-sheet-focus-mode-row-test",
  template: `
    <sd-sheet [items]="items()" [focusMode]="'row'">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetFocusModeRowTest {
  items = signal<TestItem[]>([{ name: "A", age: 1 }]);
}

// --- Slice 4: 정렬 fixtures ---

@Component({
  selector: "sd-sheet-sort-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts" [useAutoSort]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'">
        <ng-template [cell]="items()">age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSortTest {
  items = signal<TestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
    { name: "Bob", age: 35 },
  ]);
  sorts = signal<SortingDef[]>([]);
}

@Component({
  selector: "sd-sheet-sort-no-auto-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSortNoAutoTest {
  items = signal<TestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
  ]);
  sorts = signal<SortingDef[]>([]);
}

@Component({
  selector: "sd-sheet-sort-disabled-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts" [useAutoSort]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [disableSorting]="true">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetSortDisabledTest {
  items = signal<TestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
  ]);
  sorts = signal<SortingDef[]>([]);
}

// --- Slice 5: 트리 구조 + 페이지네이션 fixtures ---

export interface TreeItem {
  name: string;
  children?: TreeItem[];
}

@Component({
  selector: "sd-sheet-tree-test",
  template: `
    <sd-sheet
      [items]="items()"
      [getChildrenFn]="childrenFn"
      [(expandedItems)]="expandedItems"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetTreeTest {
  child1: TreeItem = { name: "Child1" };
  child2: TreeItem = { name: "Child2" };
  parentA: TreeItem = { name: "ParentA", children: [this.child1, this.child2] };
  parentB: TreeItem = { name: "ParentB" };

  items = signal<TreeItem[]>([this.parentA, this.parentB]);
  expandedItems = signal<TreeItem[]>([]);
  childrenFn = (item: TreeItem) => item.children;
}

@Component({
  selector: "sd-sheet-no-tree-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetNoTreeTest {
  items = signal<TestItem[]>([{ name: "A", age: 1 }]);
}

@Component({
  selector: "sd-sheet-pagination-test",
  template: `
    <sd-sheet
      [items]="items()"
      [totalPageCount]="3"
      [(currentPage)]="currentPage"
      [visiblePageCount]="10"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetPaginationTest {
  items = signal<TestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
  ]);
  currentPage = signal(0);
}

@Component({
  selector: "sd-sheet-no-pagination-test",
  template: `
    <sd-sheet [items]="items()" [totalPageCount]="1">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetNoPaginationTest {
  items = signal<TestItem[]>([{ name: "A", age: 1 }]);
}

