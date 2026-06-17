import { Component, input, model } from "@angular/core";
import { SdCrudList } from "../../../src/data/crud/sd-crud-list";
import type { SdViewType } from "../../../src/core/routing/injectViewTypeSignal";
import type { SortingDef } from "../../../src/core/selection/useSortingManager";

@Component({
  selector: "sd-crud-list-test",
  template: `<sd-crud-list
    [(ready)]="ready"
    [initialized]="initialized()"
    [(busyCount)]="busyCount"
    [restricted]="restricted()"
    [canCreate]="canCreate()"
    [canEdit]="canEdit()"
    [canDelete]="canDelete()"
    [inlineEdit]="inlineEdit()"
    [viewType]="viewType()"
    [selectMode]="selectMode()"
    [key]="'test-list'"
    [items]="items()"
    [currDeletedItems]="currDeletedItems()"
    [(selectedKeys)]="selectedKeys"
    [trackByFn]="trackByFn()"
    (submit)="onSubmit()"
    (create)="onCreate()"
    (delete)="onDelete($event)"
    (restore)="onRestore($event)"
    (filterSubmit)="onFilterSubmit()"
  />`,
  standalone: true,
  imports: [SdCrudList],
})
export class SdCrudListTestHost {
  ready = model(false);
  initialized = input(false);
  busyCount = model(0);
  restricted = input(false);
  canCreate = input(true);
  canEdit = input(true);
  canDelete = input(true);
  inlineEdit = input(true);
  viewType = input<SdViewType>("page");
  selectMode = input<"single" | "multi">();
  items = input<{ id: number; name: string }[]>([]);
  currDeletedItems = input<{ id: number; name: string }[]>([]);
  selectedKeys = model<number[]>([]);
  sorts = model<SortingDef[]>([]);
  trackByFn = input<(item: { id: number; name: string }) => number>(
    (item: { id: number; name: string }) => item.id,
  );

  submitCount = 0;
  createCount = 0;
  deletedItems: any[] = [];
  restoredItems: any[] = [];
  filterSubmitCount = 0;

  onSubmit() {
    this.submitCount++;
  }

  onCreate() {
    this.createCount++;
  }

  onDelete(items: any[]) {
    this.deletedItems = items;
  }

  onRestore(items: any[]) {
    this.restoredItems = items;
  }

  onFilterSubmit() {
    this.filterSubmitCount++;
  }
}
