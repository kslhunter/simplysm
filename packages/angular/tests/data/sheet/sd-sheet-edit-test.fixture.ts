import { Component, signal } from "@angular/core";
import "@simplysm/core-browser";
import { SdSheet } from "../../../src/data/sheet/sd-sheet";
import { SdSheetColumn } from "../../../src/data/sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";
import type { SortingDef } from "../../../src/core/selection/useSortingManager";

export interface EditTestItem {
  name: string;
  age: number;
}

@Component({
  selector: "sd-sheet-edit-test",
  template: `
    <sd-sheet [items]="items()" (itemKeydown)="lastItemKeydown.set($event)" (cellKeydown)="lastCellKeydown.set($event)" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-editing="edit">
          @if (editing) {
            <input type="text" class="_name-input" />
          } @else {
            <span class="_name-display">name</span>
          }
        </ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'age'" [header]="'나이'" [width]="'100px'">
        <ng-template [cell]="items()" let-editing="edit">
          @if (editing) {
            <input type="text" class="_age-input" />
          } @else {
            <span class="_age-display">age</span>
          }
        </ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetEditTest {
  items = signal<EditTestItem[]>([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: 35 },
  ]);
  lastItemKeydown = signal<any>(undefined);
  lastCellKeydown = signal<any>(undefined);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-edit-textarea-test",
  template: `
    <sd-sheet [items]="items()" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-editing="edit">
          @if (editing) {
            <textarea class="_name-textarea"></textarea>
          } @else {
            <span>name</span>
          }
        </ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetEditTextareaTest {
  items = signal<EditTestItem[]>([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-edit-contenteditable-test",
  template: `
    <sd-sheet [items]="items()" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-editing="edit">
          @if (editing) {
            <div contenteditable="true" class="_name-editable">editable</div>
          } @else {
            <span>name</span>
          }
        </ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetEditContenteditableTest {
  items = signal<EditTestItem[]>([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
  trackByFn = (item: EditTestItem) => item.name;
}

// --- Slice 2: 컬럼 리사이징 fixtures ---

@Component({
  selector: "sd-sheet-resize-test",
  template: `
    <sd-sheet [items]="items()" [(sorts)]="sorts" [trackByFn]="trackByFn">
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
export class SdSheetResizeTest {
  items = signal<EditTestItem[]>([{ name: "Alice", age: 30 }]);
  sorts = signal<SortingDef[]>([]);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-resize-disabled-test",
  template: `
    <sd-sheet [items]="items()" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'" [disableResizing]="true">
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
export class SdSheetResizeDisabledTest {
  items = signal<EditTestItem[]>([{ name: "Alice", age: 30 }]);
  trackByFn = (item: EditTestItem) => item.name;
}

// --- Slice 3: config bar fixtures ---

@Component({
  selector: "sd-sheet-config-bar-key-test",
  template: `
    <sd-sheet [items]="items()" [key]="'test-sheet'" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetConfigBarKeyTest {
  items = signal<EditTestItem[]>([{ name: "A", age: 1 }]);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-config-bar-page-test",
  template: `
    <sd-sheet [items]="items()" [totalPageCount]="3" [(currentPage)]="currentPage" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetConfigBarPageTest {
  items = signal<EditTestItem[]>([{ name: "A", age: 1 }]);
  currentPage = signal(0);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-no-config-bar-test",
  template: `
    <sd-sheet [items]="items()" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetNoConfigBarTest {
  items = signal<EditTestItem[]>([{ name: "A", age: 1 }]);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-one-page-no-config-bar-test",
  template: `
    <sd-sheet [items]="items()" [itemsPerPage]="10" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetOnePageNoConfigBarTest {
  items = signal<EditTestItem[]>([{ name: "A", age: 1 }]);
  trackByFn = (item: EditTestItem) => item.name;
}

@Component({
  selector: "sd-sheet-hide-config-bar-test",
  template: `
    <sd-sheet [items]="items()" [key]="'test-sheet'" [totalPageCount]="3" [hideConfigBar]="true" [trackByFn]="trackByFn">
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
export class SdSheetHideConfigBarTest {
  items = signal<EditTestItem[]>([{ name: "A", age: 1 }]);
  trackByFn = (item: EditTestItem) => item.name;
}
