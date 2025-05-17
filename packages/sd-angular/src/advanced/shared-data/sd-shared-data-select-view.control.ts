import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  output,
  TemplateRef,
  Type,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { StringUtils } from "@simplysm/sd-core-common";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ISharedDataBase } from "./sd-shared-data.provider";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/sd-item-of.template-directive";
import { SdBusyContainerControl } from "../../controls/sd-busy-container.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdTextfieldControl } from "../../controls/sd-textfield.control";
import { SdListControl } from "../../controls/sd-list.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdListItemControl } from "../../controls/sd-list-item.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../../providers/sd-modal.provider";
import {
  ISharedDataModalInputParam,
  ISharedDataModalOutputResult,
} from "./sd-shared-data-select.control";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdPaginationControl } from "../../controls/sd-pagination.control";
import { $model } from "../../utils/bindings/$model";
import { $signal } from "../../utils/bindings/$signal";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";

@Component({
  selector: "sd-shared-data-select-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    NgTemplateOutlet,
    SdTextfieldControl,
    SdListControl,
    SdPaneControl,
    SdListItemControl,
    SdAnchorControl,
    SdIconControl,
    SdPaginationControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      <sd-dock-container>
        @if (headerTemplateRef() || modalType()) {
          <sd-dock class="pb-default">
            <div class="flex-row">
              <div class="flex-grow">
                @if (headerTemplateRef()) {
                  <ng-template [ngTemplateOutlet]="headerTemplateRef()!"></ng-template>
                }
              </div>
              @if (modalType()) {
                <div>
                  <sd-anchor (click)="onModalButtonClick()">
                    <sd-icon [icon]="icons.externalLink" fixedWidth />
                  </sd-anchor>
                </div>
              }
            </div>
          </sd-dock>
        }

        <sd-dock class="pb-default">
          @if (!filterTemplateRef()) {
            <sd-textfield type="text" placeholder="검색어" [(value)]="searchText" />
          } @else {
            <ng-template [ngTemplateOutlet]="filterTemplateRef()!" />
          }
        </sd-dock>

        @if (pageItemCount()) {
          <sd-dock class="pb-default">
            <sd-pagination
              [(currentPage)]="page"
              [totalPageCount]="pageLength()"
            />
          </sd-dock>
        }

        <sd-pane>
          <sd-list inset>
            @if (useUndefined()) {
              <sd-list-item
                [selected]="selectedItem() === undefined"
                (click)="selectedItem.set(undefined)"
                [selectedIcon]="selectedIcon()"
              >
                @if (undefinedTemplateRef()) {
                  <ng-template [ngTemplateOutlet]="undefinedTemplateRef()!" />
                } @else {
                  <span class="tx-theme-grey-default">미지정</span>
                }
              </sd-list-item>
            }
            @for (item of displayItems(); let index = $index; track item.__valueKey) {
              <sd-list-item
                [selected]="selectedItem() === item"
                (click)="selectedItem() === item ? selectedItem.set(undefined) : selectedItem.set(item)"
                [selectedIcon]="selectedIcon()"
              >
                <ng-template
                  [ngTemplateOutlet]="itemTemplateRef() ?? null"
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
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>
  `,
})
export class SdSharedDataSelectViewControl<
  T extends ISharedDataBase<string | number>,
  TMODAL extends SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>,
> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdModal = inject(SdModalProvider);

  __selectedItem = input<T | undefined>(undefined, { alias: "selectedItem" });
  __selectedItemChange = output<T | undefined>({ alias: "selectedItemChange" });
  selectedItem = $model(this.__selectedItem, this.__selectedItemChange);

  items = input.required<T[]>();
  selectedIcon = input<IconDefinition>();
  useUndefined = input(false, { transform: transformBoolean });
  filterFn = input<(item: T, index: number) => boolean>();

  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();

  headerTemplateRef = contentChild<any, TemplateRef<void>>("headerTemplate", { read: TemplateRef });
  filterTemplateRef = contentChild<any, TemplateRef<void>>("filterTemplate", { read: TemplateRef });
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>(
    "undefinedTemplate",
    { read: TemplateRef },
  );

  busyCount = $signal(0);
  searchText = $signal<string>();

  pageItemCount = input<number>();
  page = $signal(0);
  pageLength = $computed(() => {
    if (Boolean(this.pageItemCount())) {
      return Math.ceil(this.items().length / this.pageItemCount()!);
    }
    return 0;
  });

  displayItems = $computed(() => {
    let result = this.items().filter((item) => !item.__isHidden);

    if (!StringUtils.isNullOrEmpty(this.searchText())) {
      result = result.filter((item) => item.__searchText.includes(this.searchText()!));
    }

    if (this.filterFn()) {
      result = result.filter((item, i) => this.filterFn()!(item, i));
    }

    if (Boolean(this.pageItemCount())) {
      result = result.slice(
        this.pageItemCount()! * this.page(),
        this.pageItemCount()! * (this.page() + 1),
      );
    }

    return result;
  });

  constructor() {
    $effect(() => {
      const newSelectedItem = this.items().single(
        (item) => item.__valueKey === untracked(() => this.selectedItem())?.__valueKey,
      );
      this.selectedItem.set(newSelectedItem);
    });
  }

  async onModalButtonClick(): Promise<void> {
    if (!this.modalType()) return;

    const result = await this._sdModal.showAsync(
      this.modalType()!,
      this.modalHeader() ?? "자세히...",
      {
        selectMode: "single",
        selectedItemKeys: [this.selectedItem()].filterExists().map((item) => item.__valueKey),
        ...this.modalInputParam(),
      },
    );

    if (result) {
      const newSelectedItem = this.items()
        .single((item) => item.__valueKey === result.selectedItemKeys[0]);
      this.selectedItem.set(newSelectedItem);
    }
  }
}
