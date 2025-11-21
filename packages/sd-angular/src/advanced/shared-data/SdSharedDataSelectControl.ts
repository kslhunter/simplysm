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

import { SdSelectButtonControl } from "../../controls/select/SdSelectButtonControl";
import { SdSelectItemControl } from "../../controls/select/SdSelectItemControl";
import { SdTextfieldControl } from "../../controls/SdTextfieldControl";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/SdItemOfTemplateDirective";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { ISdModal, ISdModalInfo, SdModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";
import { ISharedDataBase } from "./SdSharedDataProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { ISdSelectModal, TSdSelectModalInfo } from "../sd-data-view/SdDataSelectButtonControl";
import { SdSelectControl, TSelectModeValue } from "../../controls/select/SdSelectControl";

@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdSelectControl,
    SdTextfieldControl,
    SdSelectItemControl,
    SdItemOfTemplateDirective,
    NgTemplateOutlet,
    SdSelectButtonControl,
    FaIconComponent,
  ],
  template: `
    <sd-select
      #selectCtrl
      [(value)]="value"
      [disabled]="disabled()"
      [required]="required()"
      [inset]="inset()"
      [inline]="inline()"
      [size]="size()"
      [items]="rootDisplayItems()"
      [trackByFn]="trackByFn"
      [selectMode]="selectMode()"
      [contentClass]="selectClass()"
      [multiSelectionDisplayDirection]="multiSelectionDisplayDirection()"
      [getChildrenFn]="parentKeyProp() ? getChildren : undefined"
      [(open)]="open"
      (openChange)="onOpenChange()"
    >
      @if (modal()) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <fa-icon [icon]="icons.search" />
        </sd-select-button>
      }
      @if (editModal()) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <fa-icon [icon]="icons.edit" />
        </sd-select-button>
      }

      <ng-template #headerTpl>
        <div class="p-xs">
          <sd-textfield
            [type]="'text'"
            [(value)]="searchText"
            [placeholder]="'검색어'"
            [size]="size()"
          />
        </div>
      </ng-template>

      <ng-template #beforeTpl>
        @if (
          (!required() && selectMode() === "single") || (useUndefined() && selectMode() === "multi")
        ) {
          <sd-select-item>
            @if (undefinedTplRef()) {
              <ng-template [ngTemplateOutlet]="undefinedTplRef()!" />
            } @else {
              <span class="tx-theme-gray-default">미지정</span>
            }
          </sd-select-item>
        }
      </ng-template>

      <ng-template
        [itemOf]="rootDisplayItems()"
        let-item="item"
        let-index="index"
        let-depth="depth"
      >
        @if (
          getItemSelectable(item, index, depth) &&
          (selectCtrl.open() || this.selectedKeys().includes(item.__valueKey))
        ) {
          <sd-select-item [value]="item.__valueKey" [hidden]="!getItemVisible(item, index)">
            <span
              [style.text-decoration]="getIsHiddenFn()(item, index) ? 'line-through' : undefined"
            >
              <ng-template
                [ngTemplateOutlet]="itemTplRef() ?? null"
                [ngTemplateOutletContext]="{
                  $implicit: item,
                  item: item,
                  index: index,
                  depth: depth,
                }"
              ></ng-template>
            </span>
          </sd-select-item>
        }
      </ng-template>
    </sd-select>
  `,
})
export class SdSharedDataSelectControl<
  TItem extends ISharedDataBase<string | number>,
  TMode extends keyof TSelectModeValue<TItem>,
  TModal extends ISdSelectModal<any>,
> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  value = model<TSelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();

  items = input.required<TItem[]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  useUndefined = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  selectMode = input("single" as TMode);
  filterFn = input<(item: TItem, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();

  modal = input<TSdSelectModalInfo<TModal>>();

  editModal = input<ISdModalInfo<ISdModal<boolean>>>();

  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  getIsHiddenFn = input<(item: TItem, index: number) => boolean>((item) => item.__isHidden);
  getSearchTextFn = input<(item: TItem, index: number) => string>((item) => item.__searchText);
  parentKeyProp = input<string>();
  displayOrderKeyProp = input<string>();

  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplateDirective,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<any, TemplateRef<void>>("undefinedTpl", {
    read: TemplateRef,
  });

  trackByFn = (item: TItem) => item.__valueKey;

  open = $signal(false);

  searchText = $signal<string>();

  itemByParentKeyMap = $computed(() => {
    if (this.parentKeyProp() !== undefined) {
      return this.items()
        .groupBy((item) => item[this.parentKeyProp()!])
        .toMap(
          (item) => item.key,
          (item1) => item1.values,
        ) as Map<TItem["__valueKey"] | undefined, any>;
    } else {
      return undefined;
    }
  });

  rootDisplayItems = $computed(() => {
    let result = this.items().filter(
      (item, index) =>
        (!this.filterFn() || this.filterFn()!(item, index, ...(this.filterFnParams() ?? []))) &&
        (this.parentKeyProp() === undefined || item[this.parentKeyProp()!] === undefined),
    );

    if (this.displayOrderKeyProp() !== undefined) {
      result = result.orderBy((item) => item[this.displayOrderKeyProp()!]);
    }

    return result;
  });

  selectedKeys = $computed(() =>
    (this.selectMode() === "multi" ? (this.value() as any[]) : [this.value()]).filterExists(),
  );

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(item: any, index: number, depth: number) {
    return (
      this.parentKeyProp() === undefined || depth !== 0 || item[this.parentKeyProp()!] === undefined
    );
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(item: any, index: number) {
    return (
      (this.isIncludeSearchText(item, index) && !this.getIsHiddenFn()(item, index)) ||
      this.value() === item.__valueKey ||
      (this.value() instanceof Array && (this.value() as any[]).includes(item.__valueKey))
    );
  }

  isIncludeSearchText(item: any, index: number): boolean {
    const splitSearchTexts =
      this.searchText()
        ?.trim()
        .split(" ")
        .map((item1) => item1.trim())
        .filter((item1) => Boolean(item1)) ?? [];

    const itemText = this.getSearchTextFn()(item, index);
    for (const splitSearchText of splitSearchTexts) {
      if (!itemText.toLowerCase().includes(splitSearchText.toLowerCase())) {
        return false;
      }
    }

    if (this.parentKeyProp() !== undefined) {
      const children = this.getChildren(item);
      for (let i = 0; i < children.length; i++) {
        if (this.isIncludeSearchText(children[i], i)) {
          return true;
        }
      }
    }

    return true;
  }

  getChildren = (item: ISharedDataBase<string | number>): any[] => {
    let result = this.itemByParentKeyMap()?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp() !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp()!]);
    }

    return result;
  };

  onOpenChange() {
    this.searchText.set(undefined);
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = this.modal();
    if (!modal) return;

    const result = await this.#sdModal.showAsync({
      ...modal,
      inputs: {
        selectMode: this.selectMode(),
        selectedItemKeys: this.selectedKeys(),
        ...modal.inputs,
      },
    });

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  async onEditModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = this.editModal();
    if (!modal) return;

    await this.#sdModal.showAsync(modal);
  }
}
