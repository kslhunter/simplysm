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
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SdBusyContainerControl } from "../../controls/sd-busy-container.control";
import { SdListItemControl } from "../../controls/sd-list-item.control";
import { SdPaginationControl } from "../../controls/sd-pagination.control";
import { SdTextfieldControl } from "../../controls/sd-textfield.control";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../../directives/sd-item-of.template-directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/type-tramsforms";
import { ISharedDataBase } from "./sd-shared-data.provider";
import { setupModelHook } from "../../utils/setups/setup-model-hook";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { ISdSelectModal, TSdSelectModalInfo } from "../sd-data-sheet/sd-data-select-button.control";
import { SdRegionControl } from "../../controls/containers/sd-region";
import { SdListControl } from "../../controls/sd-list.control";
import { SdFlexControl } from "../../controls/flex/sd-flex.control";
import { SdFlexItemControl } from "../../controls/flex/sd-flex-item.control";

@Component({
  selector: "sd-shared-data-select-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    NgTemplateOutlet,
    SdTextfieldControl,
    SdListItemControl,
    SdAnchorControl,
    FaIconComponent,
    SdPaginationControl,
    FaIconComponent,
    SdRegionControl,
    SdListControl,
    SdFlexControl,
    SdFlexItemControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      <sd-flex vertical>
        <sd-flex-item>
          <sd-region [header]="header()">
            <sd-flex vertical gap="sm" padding="default">
              @if (headerTemplateRef() || modal()) {
                <sd-flex-item>
                  <sd-flex>
                    <sd-flex-item fill>
                      @if (headerTemplateRef()) {
                        <ng-template [ngTemplateOutlet]="headerTemplateRef()!"></ng-template>
                      }
                    </sd-flex-item>
                    @if (modal()) {
                      <sd-flex-item>
                        <sd-anchor (click)="onModalButtonClick()">
                          <fa-icon [icon]="icons.externalLink" [fixedWidth]="true" />
                        </sd-anchor>
                      </sd-flex-item>
                    }
                  </sd-flex>
                </sd-flex-item>
              }

              <sd-flex-item>
                @if (!filterTemplateRef()) {
                  <sd-textfield type="text" placeholder="검색어" [(value)]="searchText" />
                } @else {
                  <ng-template [ngTemplateOutlet]="filterTemplateRef()!" />
                }
              </sd-flex-item>
            </sd-flex>
          </sd-region>
        </sd-flex-item>

        <sd-flex-item fill>
          <sd-region>
            <sd-flex vertical gap="default">
              @if (pageItemCount()) {
                <sd-flex-item>
                  <sd-pagination [(currentPage)]="page" [totalPageCount]="pageLength()" />
                </sd-flex-item>
              }

              <sd-flex-item fill>
                <sd-list inset>
                  @if (useUndefined()) {
                    <sd-list-item
                      [selected]="selectedItem() === undefined"
                      (click)="select(undefined)"
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
                      (click)="toggle(item)"
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
              </sd-flex-item>
            </sd-flex>
          </sd-region>
        </sd-flex-item>
      </sd-flex>
    </sd-busy-container>
  `,
})
export class SdSharedDataSelectListControl<T extends ISharedDataBase<string | number>, TModal extends ISdSelectModal> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  selectedItem = model<T>();
  canChangeFn = input<(item: T | undefined) => boolean | Promise<boolean>>(() => true);

  items = input.required<T[]>();
  selectedIcon = input<IconDefinition>();
  useUndefined = input(false, { transform: transformBoolean });
  filterFn = input<(item: T, index: number) => boolean>();

  modal = input<TSdSelectModalInfo<TModal>>();

  header = input<string>();

  headerTemplateRef = contentChild<any, TemplateRef<void>>("headerTemplate", { read: TemplateRef });
  filterTemplateRef = contentChild<any, TemplateRef<void>>("filterTemplate", { read: TemplateRef });
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>("undefinedTemplate", {
    read: TemplateRef,
  });

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
      result = result.slice(this.pageItemCount()! * this.page(), this.pageItemCount()! * (this.page() + 1));
    }

    return result;
  });

  constructor() {
    setupModelHook(this.selectedItem, this.canChangeFn);

    $effect([this.items], () => {
      const newSelectedItem = this.items().single((item) => item.__valueKey === this.selectedItem()?.__valueKey);
      this.selectedItem.set(newSelectedItem);
    });
  }

  select(item: T | undefined) {
    this.selectedItem.set(item);
  }

  toggle(item: T | undefined) {
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
      const newSelectedItem = this.items().single((item) => item.__valueKey === result.selectedItemKeys[0]);
      this.selectedItem.set(newSelectedItem);
    }
  }
}
