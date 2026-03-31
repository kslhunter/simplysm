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
import type { ISharedDataBase } from "../../core/providers/sd-shared-data.provider";
import {
  SdItemOfTemplateDirective,
  type SdItemOfTemplateContext,
} from "../../core/directives/sd-item-of-template.directive";
import { SdModalProvider } from "../../ui/overlay/modal/sd-modal.provider";
import type {
  ISdSelectModal,
  TSdSelectModalInfo,
} from "../../ui/form/button/sd-modal-select-button.control";
import { setupModelHook } from "../../core/utils/setups/setupModelHook";
import { SdPaginationControl } from "../../ui/navigation/pagination/sd-pagination.control";
import { SdTextfieldControl } from "../../ui/form/input/sd-textfield.control";
import { SdAnchorControl } from "../../ui/form/button/sd-anchor.control";
import { SdListControl } from "../../ui/data/list/sd-list.control";
import { SdListItemControl } from "../../ui/data/list/sd-list-item.control";
import { NgIcon } from "@ng-icons/core";
import { tablerExternalLink } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-shared-data-select-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTextfieldControl,
    SdPaginationControl,
    SdAnchorControl,
    SdListControl,
    SdListItemControl,
    NgIcon,
  ],
  host: {
    class: "flex-column fill",
  },
  template: `
    @if (header()) {
      <div class="control-header p-default">
        {{ header() }}
      </div>
    }

    <div class="flex-column gap-sm p-default pt-0">
      @if (headerTplRef() || modal()) {
        <div class="flex-row">
          <div class="flex-fill">
            @if (headerTplRef()) {
              <ng-template [ngTemplateOutlet]="headerTplRef()!"></ng-template>
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
              [selected]="selectedItem() === undefined"
              (click)="select(undefined)"
              [selectedIcon]="selectedIcon()"
            >
              @if (undefinedTplRef()) {
                <ng-template [ngTemplateOutlet]="undefinedTplRef()!" />
              } @else {
                <span class="tx-theme-gray-default">미지정</span>
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
export class SdSharedDataSelectListControl<
  TItem extends ISharedDataBase<string | number>,
  TModal extends ISdSelectModal<any>,
> {
  private readonly _sdModal = inject(SdModalProvider);

  selectedItem = model<TItem>();
  canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(
    () => true,
  );

  items = input.required<TItem[]>();
  selectedIcon = input<string>();
  useUndefined = input(false, { transform: booleanAttribute });
  filterFn = input<(item: TItem, index: number) => boolean>();

  modal = input<TSdSelectModalInfo<TModal>>();

  header = input<string>();

  headerTplRef = contentChild<any, TemplateRef<void>>("headerTpl", {
    read: TemplateRef,
  });
  filterTplRef = contentChild<any, TemplateRef<void>>("filterTpl", {
    read: TemplateRef,
  });
  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplateDirective,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<any, TemplateRef<void>>("undefinedTpl", {
    read: TemplateRef,
  });

  searchText = signal<string | undefined>(undefined);

  pageItemCount = input<number>();
  page = signal(0);
  pageLength = computed(() => {
    const pic = this.pageItemCount();
    if (pic != null && pic > 0) {
      return Math.ceil(this.items().length / pic);
    }
    return 0;
  });

  displayItems = computed(() => {
    let result = this.items().filter((item) => !item.__isHidden);

    if (!str.isNullOrEmpty(this.searchText())) {
      result = result.filter((item) =>
        item.__searchText.includes(this.searchText()!),
      );
    }

    if (this.filterFn() != null) {
      result = result.filter((item, i) => this.filterFn()!(item, i));
    }

    const pic = this.pageItemCount();
    if (pic != null && pic > 0) {
      result = result.slice(pic * this.page(), pic * (this.page() + 1));
    }

    return result;
  });

  constructor() {
    setupModelHook(this.selectedItem, this.canChangeFn);

    // items 변경 시 selectedItem 동기화 (selectedItem은 추적하지 않음)
    effect(() => {
      const items = this.items();
      const current = untracked(() => this.selectedItem());
      if (current != null) {
        const updated = items.find(
          (item) => item.__valueKey === current.__valueKey,
        );
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
        selectedItemKeys: [this.selectedItem()]
          .filter((v): v is NonNullable<typeof v> => v != null)
          .map((item) => item.__valueKey),
        ...modalInfo.inputs,
      } as any,
    });

    if (result != null) {
      const newSelectedItem = this.items().find(
        (item) => item.__valueKey === result.selectedItemKeys[0],
      );
      this.selectedItem.set(newSelectedItem);
    }
  }

  protected readonly tablerExternalLink = tablerExternalLink;
}
