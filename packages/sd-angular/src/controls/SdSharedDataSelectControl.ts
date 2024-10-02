import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  model,
  TemplateRef,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { ISharedDataBase } from "../providers/SdSharedDataProvider";
import { SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdSelectControl, TSelectValue } from "./SdSelectControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdTextfieldControl } from "./SdTextfieldControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdSelectButtonControl } from "./SdSelectButtonControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $computed, $signal } from "../utils/$hooks";

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
    SdSelectButtonControl,
    FaIconComponent,
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
      [getChildrenFn]="parentKeyProp() ? getChildrenFn : undefined"
      (openChange)="onOpenChange()"
    >
      @if (modalType()) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <fa-icon [icon]="icons.search" />
        </sd-select-button>
      }
      @if (editModal()) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <fa-icon [icon]="icons.edit" />
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
        @if ((!required() && selectMode() === "single") || (useUndefined() && selectMode() === "multi")) {
          <sd-select-item>
            @if (undefinedTemplateRef()) {
              <ng-template [ngTemplateOutlet]="undefinedTemplateRef()!" />
            } @else {
              <span class="tx-theme-grey-default">미지정</span>
            }
          </sd-select-item>
        }
      </ng-template>

      <ng-template [itemOf]="rootDisplayItems()" let-item="item" let-index="index" let-depth="depth">
        @if (getItemSelectable(item, index, depth)) {
          <sd-select-item
            [value]="item.__valueKey"
            [style.display]="!getItemVisible(item, index, depth) ? 'none' : undefined"
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
  M extends keyof TSelectValue<T>,
> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  value = model<TSelectValue<T["__valueKey"] | undefined>[M]>();

  items = input.required<T[]>();

  disabled = input(false);
  required = input(false);
  useUndefined = input(false);
  inset = input(false);
  inline = input(false);

  size = input<"sm" | "lg">();
  selectMode = input("single" as M);
  filterFn = input<(item: T, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();

  modalInputParam = input<TMODAL["__tInput__"]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();
  editModal = input<[Type<TEDITMODAL>, string?, TEDITMODAL["__tInput__"]?]>();

  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  getIsHiddenFn = input<(item: T, index: number) => boolean>((item) => item.__isHidden);
  getSearchTextFn = input<(item: T, index: number) => string>((item) => item.__searchText);
  parentKeyProp = input<string>();
  displayOrderKeyProp = input<string>();

  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>("undefinedTemplate", { read: TemplateRef });

  trackByFn = (item: T, index: number) => item.__valueKey;
  getChildrenFn = (item: ISharedDataBase<string | number>, index: number, depth: number): any[] =>
    this.getChildren(item, index, depth);

  searchText = $signal<string>();

  itemByParentKeyMap = $computed(() => {
    if (this.parentKeyProp() !== undefined) {
      return this.items()
        .groupBy((item) => item[this.parentKeyProp()!])
        .toMap(
          (item) => item.key,
          (item1) => item1.values,
        ) as Map<T["__valueKey"] | undefined, any>;
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

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(item: any, index: number, depth: number) {
    return this.parentKeyProp() === undefined || depth !== 0 || item[this.parentKeyProp()!] === undefined;
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(item: any, index: number, depth: number) {
    return (
      (this.#isIncludeSearchText(item, index, depth) && !this.getIsHiddenFn()(item, index)) ||
      this.value() === item.__valueKey ||
      (this.value() instanceof Array && (this.value() as any[]).includes(item.__valueKey))
    );
  }

  #isIncludeSearchText(item: any, index: number, depth: number): boolean {
    if (
      this.getSearchTextFn()(item, index)
        .toLowerCase()
        .includes(this.searchText()?.toLowerCase() ?? "")
    ) {
      return true;
    }

    if (this.parentKeyProp() !== undefined) {
      const children = this.getChildren(item, index, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.#isIncludeSearchText(children[i], i, item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  getChildren(item: ISharedDataBase<string | number>, index: number, depth: number): any[] {
    let result = this.itemByParentKeyMap()?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp() !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp()!]);
    }

    return result;
  }

  onOpenChange() {
    this.searchText.set(undefined);
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.modalType()) return;

    const result = await this.#sdModal.showAsync(this.modalType()!, this.modalHeader() ?? "자세히...", {
      selectMode: this.selectMode(),
      selectedItemKeys: (this.selectMode() === "multi" ? (this.value() as any[]) : [this.value()]).filterExists(),
      ...this.modalInputParam(),
    });

    if (result) {
      const newValue = this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
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

    await this.#sdModal.showAsync(type, header, params);
  }
}

export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}
