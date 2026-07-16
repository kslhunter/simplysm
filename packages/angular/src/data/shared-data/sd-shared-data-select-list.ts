import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { str } from "@simplysm/core-common";
import { matchesSearchText } from "./matchesSearchText";
import type { SharedDataBase } from "../../core/shared-data/sd-shared-data.provider";
import {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "../../core/template/sd-item-of-template";
import { SdModalProvider } from "../../core/modal/sd-modal.provider";
import type {
  SdSelectModal,
  SdSelectModalInfo,
} from "../../controls/button/sd-modal-select-button";
import { setupModelHook } from "../../core/setupModelHook";
import { SdPagination } from "../../controls/pagination/sd-pagination";
import { SdTextfield } from "../../controls/input/sd-textfield";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { NgIcon } from "@ng-icons/core";
import { tablerExternalLink } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-shared-data-select-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, SdTextfield, SdPagination, SdAnchor, SdList, SdListItem, NgIcon],
  host: {
    class: "flex-column fill",
  },
  template: `
    <div class="flex-column gap-sm pt-default ph-sm">
      @if (header() || headerTplRef() || modal()) {
        <div class="flex-row">
          <div class="flex-fill">
            @if (headerTplRef()) {
              <ng-template [ngTemplateOutlet]="headerTplRef()!"></ng-template>
            }
            @if (header()) {
              <div class="control-header">
                {{ header() }}
              </div>
            }
          </div>
          @if (modal()) {
            <sd-anchor (click)="onModalButtonClick()">
              <ng-icon [svg]="tablerExternalLink" />
            </sd-anchor>
          }
        </div>
      }

      @if (!filterTplRef()) {
        <sd-textfield [type]="'text'" [placeholder]="'검색어'" [(value)]="searchText" />
      } @else {
        <div>
          <ng-template [ngTemplateOutlet]="filterTplRef()!" />
        </div>
      }
    </div>

    <div class="flex-fill">
      <div class="flex-column gap-default">
        @if (pageItemCount()) {
          <sd-pagination [(currentPage)]="page" [totalPageCount]="pageLength()" />
        }

        <sd-list [inset]="true" class="flex-fill">
          @if (useUndefined()) {
            <sd-list-item
              [selected]="selectedItem() == null"
              (click)="select(undefined)"
              [selectedIcon]="selectedIcon()"
            >
              @if (undefinedTplRef()) {
                <ng-template [ngTemplateOutlet]="undefinedTplRef()!" />
              } @else {
                <span class="tx-gray">미지정</span>
              }
            </sd-list-item>
          }
          @for (item of displayItems(); let index = $index; track item.__valueKey) {
            <sd-list-item
              [selected]="selectedItem() === item"
              (click)="toggle(item)"
              [selectedIcon]="selectedIcon()"
            >
              <ng-template
                [ngTemplateOutlet]="itemTplRef() ?? null"
                [ngTemplateOutletContext]="{
                  $implicit: item,
                  item: item,
                  index: index,
                  depth: 0,
                }"
              ></ng-template>
            </sd-list-item>
          }
        </sd-list>
      </div>
    </div>
  `,
})
export class SdSharedDataSelectList<
  TItem extends SharedDataBase<string | number>,
  TModal extends SdSelectModal<any>,
> {
  private readonly _sdModal = inject(SdModalProvider);

  selectedItem = model<TItem>();
  canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(() => true);

  items = input.required<TItem[]>();
  selectedIcon = input<string>();
  useUndefined = input(false, { transform: booleanAttribute });
  filterFn = input<(item: TItem, index: number) => boolean>();

  modal = input<SdSelectModalInfo<TModal>>();

  header = input<string>();

  headerTplRef = contentChild<unknown, TemplateRef<void>>("headerTpl", {
    read: TemplateRef,
  });
  filterTplRef = contentChild<unknown, TemplateRef<void>>("filterTpl", {
    read: TemplateRef,
  });
  itemTplRef = contentChild<SdItemOfTemplate<TItem>, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<unknown, TemplateRef<void>>("undefinedTpl", {
    read: TemplateRef,
  });

  searchText = signal<string | undefined>(undefined);

  pageItemCount = input<number>();
  page = signal(0);

  private readonly _filteredItems = computed(() => {
    let result = this.items().filter((item) => !item.__isHidden);

    if (!str.isNullOrEmpty(this.searchText())) {
      result = result.filter((item) => matchesSearchText(item.__searchText, this.searchText()));
    }

    if (this.filterFn() != null) {
      result = result.filter((item, i) => this.filterFn()!(item, i));
    }

    return result;
  });

  pageLength = computed(() => {
    const pic = this.pageItemCount();
    if (pic != null && pic > 0) {
      return Math.ceil(this._filteredItems().length / pic);
    }
    return 0;
  });

  displayItems = computed(() => {
    const filtered = this._filteredItems();

    const pic = this.pageItemCount();
    if (pic != null && pic > 0) {
      return filtered.slice(pic * this.page(), pic * (this.page() + 1));
    }

    return filtered;
  });

  constructor() {
    setupModelHook(this.selectedItem, this.canChangeFn);

    // items 변경 시 selectedItem 동기화 (selectedItem은 추적하지 않음)
    effect(() => {
      const items = this.items();
      const current = untracked(() => this.selectedItem());
      if (current != null) {
        const updated = items.find((item) => item.__valueKey === current.__valueKey);
        if (updated !== current) {
          this.selectedItem.set(updated);
        }
      }
    });
  }

  select(item: TItem | undefined): void {
    this.selectedItem.set(item);
  }

  toggle(item: TItem | undefined): void {
    this.selectedItem.update((v) => (v === item ? undefined : item));
  }

  async onModalButtonClick(): Promise<void> {
    const modalInfo = this.modal();
    if (modalInfo == null) return;

    const result = await this._sdModal.showAsync({
      ...modalInfo,
      inputs: {
        selectMode: "single",
        selectedKeys: [this.selectedItem()]
          .filter((v): v is NonNullable<typeof v> => v != null)
          .map((item) => item.__valueKey),
        ...modalInfo.inputs,
      } as any,
    });

    if (result != null) {
      const newSelectedItem = this.items().find(
        (item) => item.__valueKey === result.selectedKeys[0],
      );
      this.selectedItem.set(newSelectedItem);
    }
  }

  protected readonly tablerExternalLink = tablerExternalLink;
}
