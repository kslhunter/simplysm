import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter, inject,
  Input,
  Output,
  TemplateRef,
  Type
} from "@angular/core";
import {ISharedDataBase} from "../../providers/SdSharedDataProvider";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {SdModalBase, SdModalProvider} from "../../providers/SdModalProvider";
import {SdSharedDataItemTemplateContext, SdSharedDataItemTemplateDirective} from "./SdSharedDataItemTemplateDirective";
import {SdDoCheckHelper} from "../../utils/SdDoCheckHelper";

@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-select [value]="value"
               (valueChange)="onValueChange($event)"
               [disabled]="disabled"
               [required]="required"
               [inset]="inset"
               [inline]="inline"
               [size]="size"
               [items]="rootDisplayItems"
               [trackByFn]="trackByFn"
               [selectMode]="selectMode"
               [contentClass]="selectClass"
               [multiSelectionDisplayDirection]="multiSelectionDisplayDirection"
               [getChildrenFn]="parentKeyProp ? getChildrenFn : undefined">
      <ng-template #header>
        <sd-dock-container>
          <sd-dock class="bdb bdb-trans-default" *ngIf="getSearchTextFn">
            <sd-textfield [(value)]="searchText" placeholder="검색어" inset></sd-textfield>
          </sd-dock>

          <sd-pane class="p-xs-default bdb bdb-trans-default" *ngIf="modalType">
            <sd-anchor (click)="onDetailButtonClick()">자세히...</sd-anchor>
          </sd-pane>
        </sd-dock-container>
      </ng-template>

      <ng-template #before>
        <sd-select-item *ngIf="(!required && selectMode === 'single') || (useUndefined && selectMode === 'multi')">
          <span class="tx-theme-grey-default">미지정</span>
        </sd-select-item>
      </ng-template>

      <ng-template #item let-item="item" let-index="index" let-depth="depth">
        <sd-select-item [value]="item.__valueKey"
                        *ngIf="getItemSelectable(index, item, depth)"
                        [style.display]="!getItemVisible(index, item, depth) ? 'none' : undefined">
          <span [style.text-decoration]="getIsHiddenFn(index, item) ? 'line-through' : undefined">
            <ng-template [ngTemplateOutlet]="itemTemplateRef"
                         [ngTemplateOutletContext]="{$implicit: item, item: item, index: index, depth: depth}"></ng-template>
          </span>
        </sd-select-item>
      </ng-template>
    </sd-select>`
})
export class SdSharedDataSelectControl<T extends ISharedDataBase<string | number>> implements DoCheck {
  @Input()
  items: T[] = [];

  @Input()
  value?: (T["__valueKey"][]) | T["__valueKey"];

  @Output()
  valueChange = new EventEmitter<(this["selectMode"] extends "multi" ? (T["__valueKey"][]) : T["__valueKey"]) | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  required?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  useUndefined?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  inset?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  inline?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  size?: "sm" | "lg";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"],
    notnull: true
  })
  selectMode: "single" | "multi" = "single";

  @Input()
  @SdInputValidate(Function)
  filterFn?: (index: number, item: T) => boolean;

  @ContentChild(SdSharedDataItemTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef?: TemplateRef<SdSharedDataItemTemplateContext<T>>;

  @Input()
  @SdInputValidate(Object)
  modalInputParam?: Record<string, ISharedDataModalInputParam>;

  @Input()
  modalType?: Type<SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>>;

  @Input()
  @SdInputValidate({type: String})
  modalHeader?: string;

  @Input()
  @SdInputValidate(String)
  selectClass?: string;

  @Input()
  @SdInputValidate({type: String, includes: ["vertical", "horizontal"]})
  multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  trackByFn = (index: number, item: T): (string | number) => item.__valueKey;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  getIsHiddenFn = (index: number, item: T): boolean => item.__isHidden;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  getSearchTextFn = (index: number, item: T): string => item.__searchText;

  @Input()
  @SdInputValidate(String)
  parentKeyProp?: string;

  @Input()
  @SdInputValidate(String)
  displayOrderKeyProp?: string;


  searchText?: string;

  itemByParentKeyMap?: Map<T["__valueKey"] | undefined, any>;
  rootDisplayItems: T[] = [];

  #cdr = inject(ChangeDetectorRef);
  #sdModal = inject(SdModalProvider);

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(index: number, item: any, depth: number): boolean {
    return (this.parentKeyProp === undefined || depth !== 0 || item[this.parentKeyProp] === undefined);
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(index: number, item: any, depth: number): boolean {
    return (
        this.#isIncludeSearchText(index, item, depth)
        && !this.getIsHiddenFn(index, item)
      )
      || this.value === this.trackByFn(index, item) as any
      || (
        this.value instanceof Array
        && this.value.includes(this.trackByFn(index, item) as any)
      );
  }

  #isIncludeSearchText(index: number, item: any, depth: number): boolean {
    if (this.getSearchTextFn(index, item).toLowerCase().includes(this.searchText?.toLowerCase() ?? "")) {
      return true;
    }

    if (this.parentKeyProp !== undefined) {
      const children = this.getChildrenFn(index, item, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.#isIncludeSearchText(i, children[i], item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  getChildrenFn = (index: number, item: ISharedDataBase<string | number>, depth: number): any[] => {
    let result = this.itemByParentKeyMap?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp!]);
    }

    return result;
  };

  ngDoCheck(): void {
    //-- rootDisplayItems
    SdDoCheckHelper.use($ => {
      $.run({
        items: [this.items, "all"],
        filterFn: [this.filterFn],
        parentKeyProp: [this.parentKeyProp],
        displayOrderKeyProp: [this.displayOrderKeyProp]
      }, () => {
        let result = this.items.filter((item, index) => (
          (!this.filterFn || this.filterFn(index, item))
          && (this.parentKeyProp === undefined || item[this.parentKeyProp] === undefined)
        ));

        if (this.displayOrderKeyProp !== undefined) {
          result = result.orderBy((item) => item[this.displayOrderKeyProp!]);
        }

        this.rootDisplayItems = result;
      });

      //-- itemByParentKeyMap
      $.run({
        items: [this.items, "all"],
        parentKeyProp: [this.parentKeyProp]
      }, () => {
        if (this.parentKeyProp !== undefined) {
          this.itemByParentKeyMap = this.items
            .groupBy((item) => item[this.parentKeyProp!])
            .toMap((item) => item.key, (item1) => item1.values);
        }
        else {
          this.itemByParentKeyMap = undefined;
        }
      });
    }, this.#cdr);
  }

  onValueChange(value: any | any[]): void {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }

  async onDetailButtonClick(): Promise<void> {
    if (this.modalType) {
      const result = await this.#sdModal.showAsync(this.modalType, this.modalHeader ?? "자세히...", {
        selectMode: this.selectMode,
        selectedItemKeys: (this.selectMode === "multi" ? (this.value as any[]) : [this.value]).filterExists(),
        ...this.modalInputParam
      }, {key: "sd-shared-data-select-detail-modal"});

      if (result) {
        const newValue = this.selectMode === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];

        if (this.valueChange.observed) {
          this.valueChange.emit(newValue);
        }
        else {
          this.value = newValue;
        }
      }
      this.#cdr.markForCheck();
    }
  }
}


export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}