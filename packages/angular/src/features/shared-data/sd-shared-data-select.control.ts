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
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import type { ISharedDataBase } from "../../core/providers/sd-shared-data.provider";
import { SdSelectControl, type TSelectModeValue } from "../../ui/form/select/sd-select.control";
import { SdSelectButtonControl } from "../../ui/form/select/sd-select-button.control";
import { SdSelectItemControl } from "../../ui/form/select/sd-select-item.control";
import { SdTextfieldControl } from "../../ui/form/input/sd-textfield.control";
import {
  SdItemOfTemplateDirective,
  type SdItemOfTemplateContext,
} from "../../core/directives/sd-item-of-template.directive";
import {
  SdModalProvider,
  type ISdModal,
  type ISdModalInfo,
} from "../../ui/overlay/modal/sd-modal.provider";
import type {
  ISdSelectModal,
  TSdSelectModalInfo,
} from "../../ui/form/button/sd-modal-select-button.control";
import { NgIcon } from "@ng-icons/core";
import { tablerEdit, tablerSearch } from "@ng-icons/tabler-icons";

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
    NgIcon,
  ],
  template: `
    <sd-select
      [value]="$any(value())"
      (valueChange)="value.set($any($event))"
      [disabled]="disabled()"
      [required]="required()"
      [inset]="inset()"
      [inline]="inline()"
      [size]="size()"
      [items]="rootDisplayItems()"
      [selectMode]="selectMode()"
      [contentClass]="selectClass()"
      [multiSelectionDisplayDirection]="multiSelectionDisplayDirection()"
      [getChildrenFn]="hasParentKey() ? getChildren : undefined"
    >
      @if (modal()) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <ng-icon [svg]="tablerSearch" />
        </sd-select-button>
      }
      @if (editModal()) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <ng-icon [svg]="tablerEdit" />
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
          (!required() && selectMode() === "single") ||
          (useUndefined() && selectMode() === "multi")
        ) {
          <div
            class="_sd-shared-data-select-undefined"
            tabindex="0"
            (click)="onUndefinedClick()"
            (keydown.enter)="onUndefinedClick()"
            (keydown.space)="onUndefinedClick(); $event.preventDefault()"
          >
            @if (undefinedTplRef()) {
              <ng-template [ngTemplateOutlet]="undefinedTplRef()!" />
            } @else {
              <span class="tx-theme-gray-default">미지정</span>
            }
          </div>
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
          (isDropdownOpen() || selectedKeys().includes(item.__valueKey))
        ) {
          <sd-select-item [value]="item.__valueKey" [hidden]="!getItemVisible(item, index)">
            <span
              [style.text-decoration]="
                getIsHiddenFn()(item, index) ? 'line-through' : undefined
              "
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
  private readonly _sdModal = inject(SdModalProvider);
  private readonly _selectCtrl = viewChild(SdSelectControl);

  value = model<TSelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();

  items = input.required<TItem[]>();

  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  useUndefined = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });

  size = input<"sm" | "lg">();
  selectMode = input("single" as TMode);
  filterFn = input<(item: TItem, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();

  modal = input<TSdSelectModalInfo<TModal>>();
  editModal = input<ISdModalInfo<ISdModal<boolean>>>();

  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical">();
  getIsHiddenFn = input<(item: TItem, index: number) => boolean>(
    (item) => item.__isHidden,
  );
  getSearchTextFn = input<(item: TItem, index: number) => string>(
    (item) => item.__searchText,
  );
  displayOrderKeyProp = input<string>();

  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplateDirective,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<any, TemplateRef<void>>("undefinedTpl", {
    read: TemplateRef,
  });

  searchText = signal<string | undefined>(undefined);

  isDropdownOpen = computed(() => this._selectCtrl()?.dropdownOpen() ?? false);

  hasParentKey = computed(() =>
    this.items().some((item) => item.__parentKey != null),
  );

  itemByParentKeyMap = computed(() => {
    if (!this.hasParentKey()) return undefined;

    const map = new Map<TItem["__valueKey"] | undefined, TItem[]>();
    for (const item of this.items()) {
      const parentKey = item.__parentKey as TItem["__valueKey"] | undefined;
      const existing = map.get(parentKey);
      if (existing != null) {
        existing.push(item);
      } else {
        map.set(parentKey, [item]);
      }
    }
    return map;
  });

  rootDisplayItems = computed(() => {
    let result = this.items().filter((item, index) => {
      if (this.filterFn() != null) {
        if (!this.filterFn()!(item, index, ...(this.filterFnParams() ?? []))) {
          return false;
        }
      }
      if (this.hasParentKey()) {
        return item.__parentKey == null;
      }
      return true;
    });

    const orderProp = this.displayOrderKeyProp();
    if (orderProp != null) {
      result = [...result].sort((a, b) => {
        const aVal = (a as any)[orderProp];
        const bVal = (b as any)[orderProp];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    return result;
  });

  selectedKeys = computed((): any[] => {
    const val = this.value();
    if (val == null) return [];
    if (Array.isArray(val)) return val;
    return [val];
  });

  constructor() {
    // 드롭다운 닫힘 시 검색어 초기화
    effect(() => {
      const ctrl = this._selectCtrl();
      if (ctrl != null) {
        ctrl.dropdownOpen();
      }
      untracked(() => this.searchText.set(undefined));
    });
  }

  getItemSelectable(item: TItem, _index: number, depth: number): boolean {
    if (!this.hasParentKey()) return true;
    // depth가 0이면서 자식을 가진 항목(카테고리)은 선택 불가
    return depth !== 0 || item.__parentKey == null;
  }

  getItemVisible(item: TItem, index: number): boolean {
    if (
      this.isIncludeSearchText(item, index) &&
      !this.getIsHiddenFn()(item, index)
    ) {
      return true;
    }
    // 현재 선택된 항목은 항상 표시
    const val = this.value();
    if (val === item.__valueKey) return true;
    if (Array.isArray(val) && val.includes(item.__valueKey)) return true;
    return false;
  }

  isIncludeSearchText(item: TItem, index: number): boolean {
    const splitSearchTexts =
      this.searchText()
        ?.trim()
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t !== "") ?? [];

    if (splitSearchTexts.length === 0) return true;

    const itemText = this.getSearchTextFn()(item, index);
    for (const term of splitSearchTexts) {
      if (!itemText.toLowerCase().includes(term.toLowerCase())) {
        // 트리 구조에서 자식 중 매칭 항목 확인
        if (this.hasParentKey()) {
          const children = this.getChildren(item);
          for (let i = 0; i < children.length; i++) {
            if (this.isIncludeSearchText(children[i], i)) {
              return true;
            }
          }
        }
        return false;
      }
    }
    return true;
  }

  getChildren = (item: ISharedDataBase<string | number>): TItem[] => {
    let result =
      this.itemByParentKeyMap()?.get(item.__valueKey as TItem["__valueKey"]) ??
      [];

    const orderProp = this.displayOrderKeyProp();
    if (orderProp != null) {
      result = [...result].sort((a, b) => {
        const aVal = (a as any)[orderProp];
        const bVal = (b as any)[orderProp];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    return result;
  };

  onUndefinedClick(): void {
    this.value.set(undefined as any);
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modalInfo = this.modal();
    if (modalInfo == null) return;

    const result = await this._sdModal.showAsync({
      ...modalInfo,
      inputs: {
        selectMode: this.selectMode(),
        selectedItemKeys: this.selectedKeys(),
        ...modalInfo.inputs,
      } as any,
    });

    if (result != null) {
      const newValue =
        this.selectMode() === "multi"
          ? result.selectedItemKeys
          : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  async onEditModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modalInfo = this.editModal();
    if (modalInfo == null) return;

    await this._sdModal.showAsync(modalInfo);
  }

  protected readonly tablerSearch = tablerSearch;
  protected readonly tablerEdit = tablerEdit;
}
