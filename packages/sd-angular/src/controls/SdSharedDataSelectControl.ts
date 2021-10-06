import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  TemplateRef,
  Type
} from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { ISharedDataBase, SdSharedDataProvider } from "../providers/SdSharedDataProvider";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdModalBase, SdModalProvider } from "../providers/SdModalProvider";

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
               [items]="items"
               [trackByFn]="trackByFn"
               [selectMode]="selectMode"
               [content.class]="selectClass"
               [multiSelectionDisplayDirection]="multiSelectionDisplayDirection">
      <ng-template #header>
        <sd-dock-container>
          <sd-dock class="sd-border-bottom-brightness-default" *ngIf="getSearchTextFn">
            <sd-textfield [(value)]="searchText" placeholder="검색어" inset></sd-textfield>
          </sd-dock>

          <sd-pane class="sd-padding-xs-default sd-border-bottom-brightness-default" *ngIf="modalType">
            <sd-anchor (click)="onDetailButtonClick()">자세히...</sd-anchor>
          </sd-pane>
        </sd-dock-container>
      </ng-template>

      <ng-template #before>
        <sd-select-item *ngIf="(!required && selectMode === 'single') || (useUndefined && selectMode === 'multi')">
          <span class="sd-text-color-grey-default">미지정</span>
        </sd-select-item>
      </ng-template>

      <ng-template #item let-item="item" let-index="index">
        <sd-select-item [value]="item.__valueKey"
                        *ngIf="getItemSelectable(index, item)"
                        [hidden]="!getItemVisible(index, item)">
          <div [style.text-decoration]="!getItemVisible(index, item) ? 'line-through' : undefined">
            <ng-template [ngTemplateOutlet]="itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
          </div>
        </sd-select-item>
      </ng-template>
    </sd-select>
  `
})
export class SdSharedDataSelectControl implements OnInit, DoCheck {
  @Input()
  public value?: any | any[];

  @Output()
  public readonly valueChange = new EventEmitter<any | any[]>();

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
  public filterFn?: (index: number, item: any) => boolean;

  @ContentChild("itemTemplate", { static: true })
  public itemTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @Input()
  @SdInputValidate({ type: String })
  public serviceKey?: string;

  @Input()
  @SdInputValidate({ type: String })
  public dataKey?: string;

  @Input()
  @SdInputValidate(Object)
  public modalInputParam?: Record<string, any>;

  @Input()
  public modalType?: Type<SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>>;

  @Input()
  @SdInputValidate({ type: String })
  public modalHeader?: string;

  @Input("select.class")
  @SdInputValidate(String)
  public selectClass?: string;

  @Input()
  @SdInputValidate({ type: String, includes: ["vertical", "horizontal"] })
  public multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public trackByFn = (index: number, item: ISharedDataBase<string | number>): (string | number) => item.__valueKey;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public getIsHiddenFn = (index: number, item: ISharedDataBase<string | number>): boolean => item.__isHidden;

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public getSearchTextFn = (index: number, item: ISharedDataBase<string | number>): string => item.__searchText;

  public searchText?: string;
  public items: any[] = [];

  public selectableItems: any[] = [];

  private readonly _itemsIterableDiffer: IterableDiffer<any>;

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  public getItemSelectable(index: number, item: any): boolean {
    return !this.filterFn || this.filterFn(index, item);
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  public getItemVisible(index: number, item: any): boolean {
    return (
        this.getSearchTextFn(index, item).toLowerCase().includes(this.searchText?.toLowerCase() ?? "")
        && !this.getIsHiddenFn(index, item)
      )
      || this.value === this.trackByFn(index, item)
      || (
        this.value instanceof Array
        && this.value.includes(this.trackByFn(index, item))
      );
  }

  public constructor(private readonly _sharedData: SdSharedDataProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _iterableDiffers: IterableDiffers,
                     private readonly _modal: SdModalProvider) {
    this._itemsIterableDiffer = this._iterableDiffers.find(this.items).create((i: number, item: any) => this.trackByFn(i, item));
  }

  private readonly _prevData: Record<string, any> = {};

  public async ngOnInit(): Promise<void> {
    if (this.dataKey === undefined) return;
    if (this.serviceKey === undefined) return;

    const items = await this._sharedData.getDataAsync(this.serviceKey, this.dataKey);
    if (!items) return;
    this.items = items;
    this._cdr.markForCheck();

    this._sharedData.on(this.dataKey, () => {
      this._cdr.markForCheck();
    });
  }

  public ngDoCheck(): void {
    const itemChanges = this._itemsIterableDiffer.diff(this.items);

    const isFilterFnChange = this._prevData.filterFn !== this.filterFn;
    if (isFilterFnChange) this._prevData.filterFn = this.filterFn;

    const isValueChange = !ObjectUtil.equal(this._prevData.value, this.value);
    if (isValueChange) this._prevData.value = ObjectUtil.clone(this.value);

    const isDataKeyChange = !ObjectUtil.equal(this._prevData.dataKey, this.dataKey);
    if (isDataKeyChange) this._prevData.dataKey = ObjectUtil.clone(this.dataKey);

    if (isDataKeyChange) {
      this._cdr.markForCheck();
    }

    if (itemChanges || (this.value instanceof Array && isValueChange)) {
      this._cdr.markForCheck();
    }

    if (itemChanges || isValueChange || isFilterFnChange) {
      this.selectableItems = this.items.filter((item, i) => this.getItemSelectable(i, item));
      this._cdr.markForCheck();
    }
  }

  public onValueChange(value: any | any[]): void {
    if (this.valueChange.observers.length > 0) {
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
      }, { key: "sd-shared-data-select-detail-modal." + this.dataKey });

      if (result) {
        const newValue = this.selectMode === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];

        if (this.valueChange.observers.length > 0) {
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
