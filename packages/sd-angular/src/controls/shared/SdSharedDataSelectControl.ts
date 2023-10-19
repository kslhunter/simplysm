import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
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
  public items: T[] = [];

  @Input()
  public value?: (T["__valueKey"][]) | T["__valueKey"];

  @Output()
  public readonly valueChange = new EventEmitter<(this["selectMode"] extends "multi" ? (T["__valueKey"][]) : T["__valueKey"]) | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useUndefined?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public inset?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public inline?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"],
    notnull: true
  })
  public selectMode: "single" | "multi" = "single";

  @Input()
  @SdInputValidate(Function)
  public filterFn?: (index: number, item: T) => boolean;

  @ContentChild(SdSharedDataItemTemplateDirective, {static: true, read: TemplateRef})
  public itemTemplateRef?: TemplateRef<SdSharedDataItemTemplateContext<T>>;

  @Input()
  @SdInputValidate(Object)
  public modalInputParam?: Record<string, ISharedDataModalInputParam>;

  @Input()
  public modalType?: Type<SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>>;

  @Input()
  @SdInputValidate({type: String})
  public modalHeader?: string;

  @Input()
  @SdInputValidate(String)
  public selectClass?: string;

  @Input()
  @SdInputValidate({type: String, includes: ["vertical", "horizontal"]})
  public multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public trackByFn = (index: number, item: T): (string | number) => item.__valueKey;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public getIsHiddenFn = (index: number, item: T): boolean => item.__isHidden;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public getSearchTextFn = (index: number, item: T): string => item.__searchText;

  @Input()
  @SdInputValidate(String)
  public parentKeyProp?: string;

  @Input()
  @SdInputValidate(String)
  public displayOrderKeyProp?: string;

  public searchText?: string;

  public itemByParentKeyMap?: Map<T["__valueKey"] | undefined, any>;
  public rootDisplayItems: T[] = [];

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  public getItemSelectable(index: number, item: any, depth: number): boolean {
    return (this.parentKeyProp === undefined || depth !== 0 || item[this.parentKeyProp] === undefined);
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  public getItemVisible(index: number, item: any, depth: number): boolean {
    return (
        this._isIncludeSearchText(index, item, depth)
        && !this.getIsHiddenFn(index, item)
      )
      || this.value === this.trackByFn(index, item) as any
      || (
        this.value instanceof Array
        && this.value.includes(this.trackByFn(index, item) as any)
      );
  }

  private _isIncludeSearchText(index: number, item: any, depth: number): boolean {
    if (this.getSearchTextFn(index, item).toLowerCase().includes(this.searchText?.toLowerCase() ?? "")) {
      return true;
    }

    if (this.parentKeyProp !== undefined) {
      const children = this.getChildrenFn(index, item, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this._isIncludeSearchText(i, children[i], item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  public getChildrenFn = (index: number, item: ISharedDataBase<string | number>, depth: number): any[] => {
    let result = this.itemByParentKeyMap?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp!]);
    }

    return result;
  };

  public constructor(private readonly _cdr: ChangeDetectorRef,
                     private readonly _modal: SdModalProvider) {
  }

  private _prevData: Record<string, any> = {};

  public ngDoCheck(): void {
    const $ = new SdDoCheckHelper(this._prevData);

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

    if (Object.keys($.changeData).length > 0) {
      Object.assign(this._prevData, $.changeData);
      this._cdr.markForCheck();
    }
  }

  public onValueChange(value: any | any[]): void {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }

  public async onDetailButtonClick(): Promise<void> {
    if (this.modalType) {
      const result = await this._modal.showAsync(this.modalType, this.modalHeader ?? "자세히...", {
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
      this._cdr.markForCheck();
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