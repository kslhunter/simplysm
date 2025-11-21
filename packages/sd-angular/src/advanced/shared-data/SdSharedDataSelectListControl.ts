import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { StringUtils } from "@simplysm/sd-core-common";
import { SdListItemControl } from "../../controls/list/SdListItemControl";
import { SdPaginationControl } from "../../controls/SdPaginationControl";
import { SdTextfieldControl } from "../../controls/SdTextfieldControl";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/SdItemOfTemplateDirective";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";
import { ISharedDataBase } from "./SdSharedDataProvider";
import { setupModelHook } from "../../utils/setups/setupModelHook";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { ISdSelectModal, TSdSelectModalInfo } from "../sd-data-view/SdDataSelectButtonControl";
import { SdListControl } from "../../controls/list/SdListControl";
import { SdAnchorControl } from "../../controls/SdAnchorControl";

@Component({
  selector: "sd-shared-data-select-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTextfieldControl,
    SdListItemControl,
    FaIconComponent,
    SdPaginationControl,
    FaIconComponent,
    SdListControl,
    SdAnchorControl,
  ],
  host: {
    class: "flex-column",
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
              <fa-icon [icon]="icons.externalLink" [fixedWidth]="true" />
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
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  selectedItem = model<TItem>();
  canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(() => true);

  items = input.required<TItem[]>();
  selectedIcon = input<IconDefinition>();
  useUndefined = input(false, { transform: transformBoolean });
  filterFn = input<(item: TItem, index: number) => boolean>();

  modal = input<TSdSelectModalInfo<TModal>>();

  header = input<string>();

  headerTplRef = contentChild<any, TemplateRef<void>>("headerTpl", { read: TemplateRef });
  filterTplRef = contentChild<any, TemplateRef<void>>("filterTpl", { read: TemplateRef });
  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplateDirective,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<any, TemplateRef<void>>("undefinedTpl", { read: TemplateRef });

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
    setupModelHook(this.selectedItem, this.canChangeFn);

    $effect([this.items], () => {
      const newSelectedItem = this.items().single(
        (item) => item.__valueKey === this.selectedItem()?.__valueKey,
      );
      this.selectedItem.set(newSelectedItem);
    });
  }

  select(item: TItem | undefined) {
    this.selectedItem.set(item);
  }

  toggle(item: TItem | undefined) {
    this.selectedItem.update((v) => (v === item ? undefined : item));
  }

  async onModalButtonClick(): Promise<void> {
    const modal = this.modal();
    if (!modal) return;

    const result = await this.#sdModal.showAsync({
      ...modal,
      inputs: {
        selectMode: "single",
        selectedItemKeys: [this.selectedItem()].filterExists().map((item) => item.__valueKey),
        ...modal.inputs,
      },
    });

    if (result) {
      const newSelectedItem = this.items().single(
        (item) => item.__valueKey === result.selectedItemKeys[0],
      );
      this.selectedItem.set(newSelectedItem);
    }
  }
}
