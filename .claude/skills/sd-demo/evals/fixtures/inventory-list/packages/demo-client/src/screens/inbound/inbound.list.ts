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

interface IInboundItem {
  id: number;
  receiptNo: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  receivedAt: string;
}

interface IFilter {
  searchText: string;
}

@Component({
  selector: "app-inbound-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCrudListComponent, SdSheetColumnDirective, SdTextfieldComponent],
  template: `
    <div class="flex-column fill">
      <sd-crud-list
        title="입고 내역 조회"
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

        <sd-sheet-column [key]="'receiptNo'" [header]="'입고 번호'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.receiptNo }}</div>
          </ng-template>
        </sd-sheet-column>

        <sd-sheet-column [key]="'supplierName'" [header]="'공급처'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.supplierName }}</div>
          </ng-template>
        </sd-sheet-column>

        <sd-sheet-column [key]="'itemName'" [header]="'품목'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm">{{ item.itemName }}</div>
          </ng-template>
        </sd-sheet-column>

        <sd-sheet-column [key]="'quantity'" [header]="'수량'">
          <ng-template [cell]="items()" let-item="item">
            <div class="p-xs-sm tx-right">{{ item.quantity }}</div>
          </ng-template>
        </sd-sheet-column>
      </sd-crud-list>

      @if (initialized() && items().length === 0) {
        <div class="p-default tx-center tx-theme-gray-default">조회된 입고 내역이 없습니다.</div>
      }
    </div>
  `,
})
export class InboundListComponent {
  private readonly _sdToast = inject(SdToastProvider);

  perms = injectPermsSignal(["inbound"], ["use"]);

  ready = signal(false);
  initialized = signal(false);
  busyCount = signal(0);

  items = signal<IInboundItem[]>([]);
  selectedKeys = signal<number[]>([]);
  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<{ key: string; desc: boolean }[]>([]);

  filter = signal<IFilter>({ searchText: "" });
  lastFilter = signal<IFilter>({ searchText: "" });

  trackByFn = (item: IInboundItem) => item.id;

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
