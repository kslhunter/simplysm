import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  output,
  TemplateRef,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdSelectButtonControl } from "../../controls/sd-select-button.control";
import { SdSelectControl, TSelectValue } from "../../controls/sd-select-control";
import { SdSelectItemControl } from "../../controls/sd-select-item.control";
import { SdTextfieldControl } from "../../controls/sd-textfield.control";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/sd-item-of.template-directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $model } from "../../utils/bindings/$model";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/type-tramsforms";
import {
  ISdDataSheetControl, ISdDataSheetControlParam,
  SdDataSheetSelectModal,
} from "../sd-data-sheet/sd-data-sheet.select-modal";
import { ISharedDataBase } from "./sd-shared-data.provider";

// TODO: sd-select-modal-button을 사용하는식으로 바꿀 수 있나? 검토 필요
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
    SdIconControl,
  ],
  template: `
    <sd-select
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
      @if (modalType() || selector()) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <sd-icon [icon]="icons.search" />
        </sd-select-button>
      }
      @if (editModal()) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <sd-icon [icon]="icons.edit" />
        </sd-select-button>
      }

      <ng-template #header>
        <sd-textfield
          type="text"
          [(value)]="searchText"
          placeholder="검색어"
          [inset]="true"
          [size]="size()"
          inputStyle="outline: none"
          class="bdb bdb-trans-default"
        />
      </ng-template>

      <ng-template #before>
        @if ((!required() && selectMode() === "single") || (useUndefined()
          && selectMode() === "multi")) {
          <sd-select-item>
            @if (undefinedTemplateRef()) {
              <ng-template [ngTemplateOutlet]="undefinedTemplateRef()!" />
            } @else {
              <span class="tx-theme-grey-default">미지정</span>
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
        @if (getItemSelectable(item, index, depth)) {
          <sd-select-item
            [value]="item.__valueKey"
            [hidden]="!getItemVisible(item, index, depth)"
          >
            <span [style.text-decoration]="getIsHiddenFn()(item, index) ? 'line-through' : undefined">
              <ng-template
                [ngTemplateOutlet]="itemTemplateRef() ?? null"
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
  T extends ISharedDataBase<string | number>,
  TMODAL extends SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>,
  TEDITMODAL extends SdModalBase<any, any>,
  TSELECTOR extends ISdDataSheetControl,
  M extends keyof TSelectValue<T>,
> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdModal = inject(SdModalProvider);

  __value = input<TSelectValue<T["__valueKey"] | undefined>[M] | undefined>(
    undefined,
    { alias: "value" },
  );
  __valueChange = output<TSelectValue<T["__valueKey"] | undefined>[M] | undefined>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);

  items = input.required<T[]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  useUndefined = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  selectMode = input("single" as M);
  filterFn = input<(item: T, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();

  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();
  editModal = input<[Type<TEDITMODAL>, string?, TEDITMODAL[typeof SD_MODAL_INPUT]?]>();

  selector = input<ISdDataSheetControlParam<TSELECTOR>>();

  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  getIsHiddenFn = input<(item: T, index: number) => boolean>((item) => item.__isHidden);
  getSearchTextFn = input<(item: T, index: number) => string>((item) => item.__searchText);
  parentKeyProp = input<string>();
  displayOrderKeyProp = input<string>();

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

  trackByFn = (item: T, index: number) => item.__valueKey;

  open = $signal(false);

  searchText = $signal<string>();

  itemByParentKeyMap = $computed(() => {
    if (this.parentKeyProp() !== undefined) {
      return this.items()
        .groupBy((item) => item[this.parentKeyProp()!])
        .toMap(
          (item) => item.key,
          (item1) => item1.values,
        ) as Map<T["__valueKey"] | undefined, any>;
    }
    else {
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

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(item: any, index: number, depth: number) {
    return this.parentKeyProp()
      === undefined
      || depth
      !== 0
      || item[this.parentKeyProp()!]
      === undefined;
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(item: any, index: number, depth: number) {
    return (
      (this.isIncludeSearchText(item, index, depth) && !this.getIsHiddenFn()(item, index)) ||
      this.value() === item.__valueKey ||
      (this.value() instanceof Array && (this.value() as any[]).includes(item.__valueKey))
    );
  }

  isIncludeSearchText(item: any, index: number, depth: number): boolean {
    const splitSearchTexts = this.searchText()?.trim()
      .split(" ")
      .map((item1) => item1.trim())
      .filter((item1) => Boolean(item1)) ?? [];

    const itemText = this.getSearchTextFn()(item, index);
    for (const splitSearchText of splitSearchTexts) {
      if (!itemText.toLowerCase().includes(splitSearchText.toLowerCase())) {
        return false;
      }
    }

    /*if (
      this.getSearchTextFn()(item, index)
        .toLowerCase()
        .includes(this.searchText()?.toLowerCase() ?? "")
    ) {
      return true;
    }*/

    if (this.parentKeyProp() !== undefined) {
      const children = this.getChildren(item, index, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.isIncludeSearchText(children[i], i, item.depth + 1)) {
          return true;
        }
      }
    }

    return true;
  }

  getChildren = (item: ISharedDataBase<string | number>, index: number, depth: number): any[] => {
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

    let result: ISharedDataModalOutputResult | undefined;
    if (this.selector()) {
      result = await this._sdModal.showAsync(
        SdDataSheetSelectModal,
        "자세히...",
        {
          type: this.selector()!.type,
          inputs: this.selector()!.inputs,

          selectMode: this.selectMode(),
          selectedItemKeys: (this.selectMode() === "multi"
            ? (this.value() as any[])
            : [this.value()]).filterExists(),
          ...this.modalInputParam(),
        },
      );
    }
    else if (this.modalType()) {
      result = await this._sdModal.showAsync(
        this.modalType()!,
        this.modalHeader() ?? "자세히...",
        {
          selectMode: this.selectMode(),
          selectedItemKeys: (this.selectMode() === "multi"
            ? (this.value() as any[])
            : [this.value()]).filterExists(),
          ...this.modalInputParam(),
        },
      );
    }

    if (result) {
      const newValue = this.selectMode() === "multi"
        ? result.selectedItemKeys
        : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  async onEditModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.editModal()) return;

    const type = this.editModal()![0];
    const header = this.editModal()![1] ?? "자세히...";
    const params = this.editModal()![2];

    await this._sdModal.showAsync(type, header, params);
  }
}

export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}
