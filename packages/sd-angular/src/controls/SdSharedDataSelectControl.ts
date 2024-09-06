import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { ISharedDataBase } from "../providers/SdSharedDataProvider";
import { SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { coercionBoolean } from "../utils/commons";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdSelectControl } from "./SdSelectControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdTextfieldControl } from "./SdTextfieldControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { SdIconControl } from "./SdIconControl";
import { SdSelectButtonControl } from "./SdSelectButtonControl";
import { sdGetter, TSdGetter } from "../utils/hooks";

@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdSelectControl,
    SdDockContainerControl,
    SdDockControl,
    SdTextfieldControl,
    SdAnchorControl,
    SdPaneControl,
    SdSelectItemControl,
    SdItemOfTemplateDirective,
    NgTemplateOutlet,
    SdIconControl,
    SdSelectButtonControl,
  ],
  template: `
    <sd-select
      [value]="value"
      (valueChange)="onValueChange($event)"
      [disabled]="disabled"
      [required]="required"
      [inset]="inset"
      [inline]="inline"
      [size]="size"
      [items]="getRootDisplayItems()"
      [trackByGetter]="trackByGetter"
      [selectMode]="selectMode"
      [contentClass]="selectClass"
      [multiSelectionDisplayDirection]="multiSelectionDisplayDirection"
      [getChildrenGetter]="parentKeyProp ? getChildrenGetter : undefined"
      (openChange)="onOpenChange()"
    >
      @if (modalType) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <sd-icon [icon]="icons.search" />
        </sd-select-button>
      }
      @if (editModal) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <sd-icon [icon]="icons.edit" />
        </sd-select-button>
      }

      <ng-template #header>
        <sd-textfield
          type="text"
          [(value)]="searchText"
          placeholder="검색어"
          inset
          [size]="size"
          inputStyle="outline: none"
          class="bdb bdb-trans-default"
        />
      </ng-template>

      <ng-template #before>
        @if ((!required && selectMode === "single") || (useUndefined && selectMode === "multi")) {
          <sd-select-item>
            @if (undefinedTemplateRef) {
              <ng-template [ngTemplateOutlet]="undefinedTemplateRef" />
            } @else {
              <span class="tx-theme-grey-default">미지정</span>
            }
          </sd-select-item>
        }
      </ng-template>

      <ng-template [itemOf]="getRootDisplayItems()" let-item="item" let-index="index" let-depth="depth">
        @if (getItemSelectable(item, index, depth)) {
          <sd-select-item
            [value]="item.__valueKey"
            [style.display]="!getItemVisible(item, index, depth) ? 'none' : undefined"
          >
            <span [style.text-decoration]="getIsHiddenGetter(item, index) ? 'line-through' : undefined">
              <ng-template
                [ngTemplateOutlet]="itemTemplateRef ?? null"
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
  M extends "single" | "multi" = "single",
> {
  icons = inject(SdAngularOptionsProvider).icons;

  #cdr = inject(ChangeDetectorRef);
  #sdModal = inject(SdModalProvider);

  @Input() value?: M extends "multi" ? (T["__valueKey"] | undefined)[] : T["__valueKey"];
  @Output() valueChange = new EventEmitter<
    (this["selectMode"] extends "multi" ? (T["__valueKey"] | undefined)[] : T["__valueKey"]) | undefined
  >();

  @Input({ required: true }) items: T[] = [];

  @Input({ transform: coercionBoolean }) disabled = false;
  @Input({ transform: coercionBoolean }) required = false;
  @Input({ transform: coercionBoolean }) useUndefined = false;
  @Input({ transform: coercionBoolean }) inset = false;
  @Input({ transform: coercionBoolean }) inline = false;

  @Input() size?: "sm" | "lg";
  @Input() selectMode: M = "single" as M;
  @Input() filterGetter?: TSdGetter<(item: T, index: number, ...params: any[]) => boolean>;
  @Input() filterFnParams?: any[];

  @Input() modalInputParam?: TMODAL["__tInput__"];
  @Input() modalType?: Type<TMODAL>;
  @Input() modalHeader?: string;
  @Input() editModal?: [Type<TEDITMODAL>, string?, TEDITMODAL["__tInput__"]?];

  @Input() selectClass?: string;
  @Input() multiSelectionDisplayDirection?: "vertical" | "horizontal";
  @Input() getIsHiddenGetter: TSdGetter<(item: T, index: number) => boolean> = sdGetter(
    (item, index) => item.__isHidden,
  );
  @Input() getSearchTextGetter: TSdGetter<(item: T, index: number) => string> = sdGetter(
    (item, index) => item.__searchText,
  );
  @Input() parentKeyProp?: string;
  @Input() displayOrderKeyProp?: string;

  @ContentChild(SdItemOfTemplateDirective, { static: true, read: TemplateRef })
  itemTemplateRef?: TemplateRef<SdItemOfTemplateContext<T>>;
  @ContentChild("undefinedTemplate", { static: true, read: TemplateRef }) undefinedTemplateRef?: TemplateRef<void>;

  trackByGetter = sdGetter((item: T, index: number) => item.__valueKey);

  searchText?: string;

  getItemByParentKeyMap = sdGetter(
    () => ({
      items: [this.items, "all"],
      parentKeyProp: [this.parentKeyProp],
    }),
    () => {
      if (this.parentKeyProp !== undefined) {
        return this.items
          .groupBy((item) => item[this.parentKeyProp!])
          .toMap(
            (item) => item.key,
            (item1) => item1.values,
          ) as Map<T["__valueKey"] | undefined, any>;
      } else {
        return undefined;
      }
    },
  );

  getRootDisplayItems = sdGetter(
    async () => ({
      items: [this.items, "all"],
      ...(await this.filterGetter?.getCheckDataAsync("filterGetter")),
      filterFnParams: [this.filterFnParams, "one"],
      parentKeyProp: [this.parentKeyProp],
      displayOrderKeyProp: [this.displayOrderKeyProp],
    }),
    () => {
      let result = this.items.filter(
        (item, index) =>
          (!this.filterGetter || this.filterGetter(item, index, ...(this.filterFnParams ?? []))) &&
          (this.parentKeyProp === undefined || item[this.parentKeyProp] === undefined),
      );

      if (this.displayOrderKeyProp !== undefined) {
        result = result.orderBy((item) => item[this.displayOrderKeyProp!]);
      }

      return result;
    },
  );

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(item: any, index: number, depth: number): boolean {
    return this.parentKeyProp === undefined || depth !== 0 || item[this.parentKeyProp] === undefined;
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(item: any, index: number, depth: number): boolean {
    return (
      (this.#isIncludeSearchText(item, index, depth) && !this.getIsHiddenGetter(item, index)) ||
      this.value === item.__valueKey ||
      (this.value instanceof Array && this.value.includes(item.__valueKey))
    );
  }

  #isIncludeSearchText(item: any, index: number, depth: number): boolean {
    if (
      this.getSearchTextGetter(item, index)
        .toLowerCase()
        .includes(this.searchText?.toLowerCase() ?? "")
    ) {
      return true;
    }

    if (this.parentKeyProp !== undefined) {
      const children = this.getChildrenGetter(item, index, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.#isIncludeSearchText(children[i], i, item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  getChildrenGetter = sdGetter(
    () => ({
      displayOrderKeyProp: [this.displayOrderKeyProp],
      itemByParentKeyMap: [this.getItemByParentKeyMap()],
    }),
    (item: ISharedDataBase<string | number>, index: number, depth: number): any[] => {
      let result = this.getItemByParentKeyMap()?.get(item.__valueKey) ?? [];

      if (this.displayOrderKeyProp !== undefined) {
        result = result.orderBy((item1) => item1[this.displayOrderKeyProp!]);
      }

      return result;
    },
  );

  onOpenChange() {
    this.searchText = undefined;
  }

  onValueChange(value: any | any[]): void {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(value);
    }
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.modalType) return;

    const result = await this.#sdModal.showAsync(this.modalType, this.modalHeader ?? "자세히...", {
      selectMode: this.selectMode,
      selectedItemKeys: (this.selectMode === "multi" ? (this.value as any[]) : [this.value]).filterExists(),
      ...this.modalInputParam,
    });

    if (result) {
      const newValue = this.selectMode === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];

      if (this.value !== newValue) {
        this.value = newValue;
        this.valueChange.emit(newValue);
      }
    }
    this.#cdr.markForCheck();
  }

  async onEditModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.editModal) return;

    const type = this.editModal[0];
    const header = this.editModal[1] ?? "자세히...";
    const param = this.editModal[2];

    await this.#sdModal.showAsync(type, header, param);
    this.#cdr.markForCheck();
  }
}

export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}
