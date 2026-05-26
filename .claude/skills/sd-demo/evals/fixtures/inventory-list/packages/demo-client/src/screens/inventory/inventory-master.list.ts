import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import {
  injectPermsSignal,
  mark,
  SdCrudListComponent,
  SdSheetColumnDirective,
  SdTextfieldComponent,
  SdToastProvider,
} from "@simplysm/angular";

interface IInventoryMasterItem {
  id: number;
  warehouseCode: string;
  itemCode: string;
  itemName: string;
  active: boolean;
}

interface IFilter {
  searchText: string;
}

@Component({
  selector: "app-inventory-master-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCrudListComponent, SdSheetColumnDirective, SdTextfieldComponent],
  template: `
    <div class="flex-column fill">
      <sd-crud-list
        title="재고 마스터"
        [(ready)]="ready"
        [initialized]="initialized()"
        [(busyCount)]="busyCount"
        [items]="items()"
        [(selectedKeys)]="selectedKeys"
        [(page)]="page"
        [totalPageCount]="pageLength()"
        [(sorts)]="sortingDefs"
        [trackByFn]="trackByFn"
        [restricted]="!perms().includes('use')"
        (filterSubmit)="onFilterSubmit()"
      >
        <ng-template #filterTpl>
          <div class="form-box-inline">
            <div>
              <label>검색</label>
              <sd-textfield [(value)]="filter().searchText" (valueChange)="mark(filter)" />
            </div>
          </div>
        </ng-template>

        <sd-sheet-column [key]="'warehouseCode'" [header]="'창고'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.warehouseCode }}</div>
          </ng-template>
        </sd-sheet-column>

        <sd-sheet-column [key]="'itemCode'" [header]="'품목 코드'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.itemCode }}</div>
          </ng-template>
        </sd-sheet-column>

        <sd-sheet-column [key]="'itemName'" [header]="'품목명'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.itemName }}</div>
          </ng-template>
        </sd-sheet-column>
      </sd-crud-list>

      @if (initialized() && items().length === 0) {
        <div class="p-default tx-center tx-theme-gray-default">조회된 재고 마스터가 없습니다.</div>
      }
    </div>
  `,
})
export class InventoryMasterListComponent {
  private readonly _sdToast = inject(SdToastProvider);

  perms = injectPermsSignal(["inventory.master"], ["use", "edit"]);

  ready = signal(false);
  initialized = signal(false);
  busyCount = signal(0);

  items = signal<IInventoryMasterItem[]>([]);
  selectedKeys = signal<number[]>([]);
  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<{ key: string; desc: boolean }[]>([]);

  filter = signal<IFilter>({ searchText: "" });
  lastFilter = signal<IFilter>({ searchText: "" });

  trackByFn = (item: IInventoryMasterItem) => item.id;

  protected readonly mark = mark;

  constructor() {
    effect(() => {
      if (!this.perms().includes("use") || !this.ready()) {
        this.initialized.set(true);
        return;
      }

      this.lastFilter();
      this.page();
      this.sortingDefs();

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });
  }

  onFilterSubmit(): void {
    this.page.set(0);
    this.lastFilter.set({ ...this.filter() });
  }

  doRefresh(): void {
    if (!this.perms().includes("use")) return;
    mark(this.lastFilter);
  }

  private async _refresh(): Promise<void> {
  }
}
