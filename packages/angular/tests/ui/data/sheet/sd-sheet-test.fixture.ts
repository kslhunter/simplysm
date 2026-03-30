import { Component, signal } from "@angular/core";
import { SdSheetControl } from "../../../../src/ui/data/sheet/sd-sheet.control";
import { SdSheetColumnDirective } from "../../../../src/ui/data/sheet/sd-sheet-column.directive";
import type { ISortingDef } from "../../../../src/core/utils/useSortingManager";

// --- Common test interface ---

export interface ITestItem {
  name: string;
  age: number;
}

export interface ITestItem3 {
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
        <ng-template #cellTpl>cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetBasicTest {
  items = signal<ITestItem[]>([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
}

@Component({
  selector: "sd-sheet-multi-header-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'col1'" [header]="['그룹A', '세부1']" [width]="'100px'">
        <ng-template #cellTpl>cell1</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'col2'" [header]="['그룹A', '세부2']" [width]="'100px'">
        <ng-template #cellTpl>cell2</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetMultiHeaderTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-summary-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>cell</ng-template>
        <ng-template #summaryTpl>합계</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSummaryTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-hidden-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'" [hidden]="true">
        <ng-template #cellTpl>age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetHiddenTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-collapse-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'" [collapse]="true">
        <ng-template #cellTpl>age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetCollapseTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
}

@Component({
  selector: "sd-sheet-empty-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetEmptyTest {
  items = signal<ITestItem[]>([]);
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
        <ng-template #cellTpl>cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetCellStyleTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
  getClassFn = (_item: ITestItem, _colKey: string) => "custom-class";
  getStyleFn = (_item: ITestItem, _colKey: string) => "color: red";
}

@Component({
  selector: "sd-sheet-inset-test",
  template: `
    <sd-sheet [items]="items()" [inset]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>cell</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetInsetTest {
  items = signal<ITestItem[]>([{ name: "Alice", age: 30 }]);
}

// --- Slice 2: 컬럼 고정 fixtures ---

@Component({
  selector: "sd-sheet-fixed-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'100px'" [fixed]="true">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'150px'" [fixed]="true">
        <ng-template #cellTpl>age</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'city'" [header]="'도시'" [width]="'200px'">
        <ng-template #cellTpl>city</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetFixedTest {
  items = signal<ITestItem3[]>([
    { name: "Alice", age: 30, city: "Seoul" },
  ]);
}

@Component({
  selector: "sd-sheet-fixed-3col-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'a'" [header]="'A'" [width]="'100px'" [fixed]="true">
        <ng-template #cellTpl>a</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'b'" [header]="'B'" [width]="'150px'" [fixed]="true">
        <ng-template #cellTpl>b</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'c'" [header]="'C'" [width]="'200px'" [fixed]="true">
        <ng-template #cellTpl>c</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'d'" [header]="'D'" [width]="'300px'">
        <ng-template #cellTpl>d</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetFixed3ColTest {
  items = signal<ITestItem3[]>([
    { name: "Alice", age: 30, city: "Seoul" },
  ]);
}

// --- Slice 3: 행 선택 fixtures ---

@Component({
  selector: "sd-sheet-select-single-test",
  template: `
    <sd-sheet [items]="items()" [selectMode]="'single'" [(selectedItems)]="selectedItems">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSelectSingleTest {
  items = signal<ITestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<ITestItem[]>([]);
}

@Component({
  selector: "sd-sheet-select-multi-test",
  template: `
    <sd-sheet [items]="items()" [selectMode]="'multi'" [(selectedItems)]="selectedItems">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSelectMultiTest {
  items = signal<ITestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<ITestItem[]>([]);
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSelectDisabledTest {
  items = signal<ITestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
    { name: "C", age: 3 },
  ]);
  selectedItems = signal<ITestItem[]>([]);
  selectableFn = (item: ITestItem): boolean | string => {
    if (item.name === "C") return "권한 없음";
    return true;
  };
}

@Component({
  selector: "sd-sheet-no-select-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetNoSelectTest {
  items = signal<ITestItem[]>([{ name: "A", age: 1 }]);
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetAutoSelectClickTest {
  items = signal<ITestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
  ]);
  selectedItems = signal<ITestItem[]>([]);
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetAutoSelectFocusTest {
  items = signal<ITestItem[]>([
    { name: "A", age: 1 },
    { name: "B", age: 2 },
  ]);
  selectedItems = signal<ITestItem[]>([]);
}

@Component({
  selector: "sd-sheet-focus-mode-row-test",
  template: `
    <sd-sheet [items]="items()" [focusMode]="'row'">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetFocusModeRowTest {
  items = signal<ITestItem[]>([{ name: "A", age: 1 }]);
}

// --- Slice 4: 정렬 fixtures ---

@Component({
  selector: "sd-sheet-sort-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts" [useAutoSort]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'">
        <ng-template #cellTpl>age</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSortTest {
  items = signal<ITestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
    { name: "Bob", age: 35 },
  ]);
  sorts = signal<ISortingDef[]>([]);
}

@Component({
  selector: "sd-sheet-sort-no-auto-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSortNoAutoTest {
  items = signal<ITestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
  ]);
  sorts = signal<ISortingDef[]>([]);
}

@Component({
  selector: "sd-sheet-sort-disabled-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts" [useAutoSort]="true">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [disableSorting]="true">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetSortDisabledTest {
  items = signal<ITestItem[]>([
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
  ]);
  sorts = signal<ISortingDef[]>([]);
}

// --- Slice 5: 트리 구조 + 페이지네이션 fixtures ---

export interface ITreeItem {
  name: string;
  children?: ITreeItem[];
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetTreeTest {
  child1: ITreeItem = { name: "Child1" };
  child2: ITreeItem = { name: "Child2" };
  parentA: ITreeItem = { name: "ParentA", children: [this.child1, this.child2] };
  parentB: ITreeItem = { name: "ParentB" };

  items = signal<ITreeItem[]>([this.parentA, this.parentB]);
  expandedItems = signal<ITreeItem[]>([]);
  childrenFn = (item: ITreeItem) => item.children;
}

@Component({
  selector: "sd-sheet-no-tree-test",
  template: `
    <sd-sheet [items]="items()">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetNoTreeTest {
  items = signal<ITestItem[]>([{ name: "A", age: 1 }]);
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetPaginationTest {
  items = signal<ITestItem[]>([
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
        <ng-template #cellTpl>name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheetControl, SdSheetColumnDirective],
})
export class SdSheetNoPaginationTest {
  items = signal<ITestItem[]>([{ name: "A", age: 1 }]);
}
