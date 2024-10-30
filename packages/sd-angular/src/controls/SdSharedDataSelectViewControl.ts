import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  model,
  TemplateRef,
  Type,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { StringUtil } from "@simplysm/sd-core-common";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ISharedDataBase } from "../providers/SdSharedDataProvider";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdTextfieldControl } from "./SdTextfieldControl";
import { SdListControl } from "./SdListControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdListItemControl } from "./SdListItemControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { SdButtonControl } from "./SdButtonControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdAnchorControl } from "./SdAnchorControl";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { ISharedDataModalInputParam, ISharedDataModalOutputResult } from "./SdSharedDataSelectControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $computed, $effect, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/tramsforms";

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
    SdSelectItemControl,
    SdButtonControl,
    SdAnchorControl,
    FaIconComponent,
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
                    <fa-icon [icon]="icons.externalLink" [fixedWidth]="true" />
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

        <sd-pane>
          <sd-list [inset]="true">
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
            @for (item of filteredItems(); let index = $index; track item.__valueKey) {
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
  icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  selectedItem = model<T>();

  items = input.required<T[]>();
  selectedIcon = input<IconDefinition>();
  useUndefined = input(false, { transform: transformBoolean });
  filterFn = input<(item: T, index: number) => boolean>();

  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();

  headerTemplateRef = contentChild<any, TemplateRef<void>>("headerTemplate", { read: TemplateRef });
  filterTemplateRef = contentChild<any, TemplateRef<void>>("filterTemplate", { read: TemplateRef });
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>("undefinedTemplate", { read: TemplateRef });

  busyCount = $signal(0);
  searchText = $signal<string>();

  filteredItems = $computed(() => {
    let result = this.items().filter((item) => !item.__isHidden);

    if (!StringUtil.isNullOrEmpty(this.searchText())) {
      result = result.filter((item) => item.__searchText.includes(this.searchText()!));
    }

    if (this.filterFn()) {
      result = result.filter((item, i) => this.filterFn()!(item, i));
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

    const result = await this.#sdModal.showAsync(this.modalType()!, this.modalHeader() ?? "자세히...", {
      selectMode: "single",
      selectedItemKeys: [this.selectedItem()].filterExists().map((item) => item.__valueKey),
      ...this.modalInputParam(),
    });

    if (result) {
      const newSelectedItem = this.items().single((item) => item.__valueKey === result.selectedItemKeys[0]);
      this.selectedItem.set(newSelectedItem);
    }
  }
}
