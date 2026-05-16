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
import type { SharedDataBase } from "../../core/shared-data/sd-shared-data.provider";
import { SdSelect, type SelectModeValue } from "../../controls/select/sd-select";
import { SdSelectButton } from "../../controls/select/sd-select-button";
import { SdSelectItem } from "../../controls/select/sd-select-item";
import { SdTextfield } from "../../controls/input/sd-textfield";
import {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "../../core/template/sd-item-of-template";
import {
  SdModalProvider,
  type SdModalContentDef,
  type SdModalInfo,
} from "../../core/modal/sd-modal.provider";
import type {
  SdSelectModal,
  SdSelectModalInfo,
} from "../../controls/button/sd-modal-select-button";
import { NgIcon } from "@ng-icons/core";
import { tablerEdit, tablerSearch } from "@ng-icons/tabler-icons";
import { matchesSearchText } from "./matchesSearchText";

@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdSelect,
    SdTextfield,
    SdSelectItem,
    SdItemOfTemplate,
    NgTemplateOutlet,
    SdSelectButton,
    NgIcon,
  ],
  template: `
    <sd-select
      [value]="value()"
      (valueChange)="value.set($event)"
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
export class SdSharedDataSelect<
  TItem extends SharedDataBase<string | number>,
  TMode extends keyof SelectModeValue<TItem>,
  TModal extends SdSelectModal<any>,
> {
  private readonly _sdModal = inject(SdModalProvider);
  private readonly _selectCtrl = viewChild(SdSelect);

  value = model<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();

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

  modal = input<SdSelectModalInfo<TModal>>();
  editModal = input<SdModalInfo<SdModalContentDef<boolean>>>();

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
    SdItemOfTemplate,
    { read: TemplateRef },
  );
  undefinedTplRef = contentChild<any, TemplateRef<void>>("undefinedTpl", {
    read: TemplateRef,
  });

  trackByFn = (item: TItem): TItem["__valueKey"] => item.__valueKey;

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
      result = result.orderBy((item) => (item as any)[orderProp]);
    }

    return result;
  });

  private readonly _searchTextMatchCache = computed(() => {
    const cache = new Map<TItem["__valueKey"], boolean>();
    const searchText = this.searchText();
    const getSearchTextFn = this.getSearchTextFn();
    const hasParent = this.hasParentKey();
    const parentMap = this.itemByParentKeyMap();
    const items = this.items();

    const check = (item: TItem, index: number): boolean => {
      const key = item.__valueKey;
      const cached = cache.get(key);
      if (cached != null) return cached;

      const itemText = getSearchTextFn(item, index);
      if (matchesSearchText(itemText, searchText)) {
        cache.set(key, true);
        return true;
      }

      if (hasParent && parentMap != null) {
        const children = parentMap.get(key) ?? [];
        for (let i = 0; i < children.length; i++) {
          if (check(children[i], i)) {
            cache.set(key, true);
            return true;
          }
        }
      }

      cache.set(key, false);
      return false;
    };

    for (let i = 0; i < items.length; i++) {
      check(items[i], i);
    }

    return cache;
  });

  selectedKeys = computed((): any[] => {
    const val = this.value();
    if (val == null) return [];
    if (Array.isArray(val)) return val;
    return [val];
  });

  constructor() {
    // 드롭다운 닫힘 시 검색어 초기화 (open → closed 전환 시에만)
    let prevOpen = false;
    effect(() => {
      const ctrl = this._selectCtrl();
      const currentOpen = ctrl != null ? ctrl.dropdownOpen() : false;

      if (prevOpen && !currentOpen) {
        untracked(() => this.searchText.set(undefined));
      }
      prevOpen = currentOpen;
    });
  }

  getItemSelectable(item: TItem, _index: number, depth: number): boolean {
    if (!this.hasParentKey()) return true;
    // 트리 구조에서 depth가 0이면서 __parentKey가 있는 항목은 선택 불가
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

  isIncludeSearchText(item: TItem, _index: number): boolean {
    return this._searchTextMatchCache().get(item.__valueKey) ?? false;
  }

  private readonly _sortedChildrenMap = computed(() => {
    const parentMap = this.itemByParentKeyMap();
    if (parentMap == null) return undefined;

    const orderProp = this.displayOrderKeyProp();
    if (orderProp == null) return parentMap;

    const sorted = new Map<TItem["__valueKey"] | undefined, TItem[]>();
    for (const [key, children] of parentMap) {
      sorted.set(
        key,
        children.orderBy((item) => (item as any)[orderProp]),
      );
    }
    return sorted;
  });

  getChildren = (item: SharedDataBase<string | number>): TItem[] => {
    return (
      this._sortedChildrenMap()?.get(item.__valueKey) ??
      []
    );
  };

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modalInfo = this.modal();
    if (modalInfo == null) return;

    const result = await this._sdModal.showAsync({
      ...modalInfo,
      inputs: {
        selectMode: this.selectMode(),
        selectedKeys: this.selectedKeys(),
        ...modalInfo.inputs,
      } as any,
    });

    if (result != null) {
      const newValue =
        this.selectMode() === "multi"
          ? result.selectedKeys
          : result.selectedKeys[0];
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
