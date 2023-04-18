import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef
} from "@angular/core";
import { ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import { ISharedDataBase, SdSharedDataRootProvider } from "../root-providers/SdSharedDataRootProvider";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { ISdSheetColumnOrderingVM } from "./SdSheetControl";
import { SdToastProvider } from "../providers/SdToastProvider";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

@Component({
  selector: "sd-shared-data-select-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <sd-dock-container>
        <ng-container *ngIf="headerTemplateRef">
          <sd-dock class="sd-padding-default sd-padding-bottom-0">
            <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
          </sd-dock>
        </ng-container>
        <sd-dock class="sd-padding-default">
          <sd-textfield placeholder="검색어" [(value)]="searchText"></sd-textfield>
        </sd-dock>

        <sd-pane>
          <sd-list inset>
            <sd-list-item *ngIf="useUndefined"
                          [selected]="selectedItem === undefined"
                          (click)="onSelectedItemChange(undefined)"
                          [selectedIcon]="selectedIcon">
              <span class="sd-text-color-grey-default">미지정</span>
            </sd-list-item>
            <sd-list-item *ngFor="let item of filteredItems; let index = index; trackBy: trackByFn"
                          [selected]="item === selectedItem"
                          (click)="selectedItem === item ? onSelectedItemChange(undefined) : onSelectedItemChange(item)"
                          [selectedIcon]="selectedIcon">
              <ng-template [ngTemplateOutlet]="itemTemplateRef"
                           [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
            </sd-list-item>
          </sd-list>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`
})
export class SdSharedDataSelectViewControl implements OnInit, DoCheck {
  @Input()
  public selectedIcon?: IconProp;

  @Input()
  public selectedItem?: ISharedDataBase<string | number>;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  @Input()
  @SdInputValidate(Boolean)
  public useUndefined?: boolean;

  @Input()
  @SdInputValidate(Function)
  public filterFn?: (index: number, item: ISharedDataBase<string | number>) => boolean;

  @ContentChild("headerTemplate", { static: true })
  public headerTemplateRef?: TemplateRef<void>;

  @ContentChild("itemTemplate", { static: true })
  public itemTemplateRef?: TemplateRef<{ item: ISharedDataBase<string | number>; index: number }>;

  @Input()
  @SdInputValidate({ type: String })
  public dataKey?: string;

  public busyCount = 0;

  public trackByFn = (index: number, item: ISharedDataBase<string | number>): (string | number) => item.__valueKey;

  public items?: ISharedDataBase<string | number>[];

  public searchText?: string;
  public ordering: ISdSheetColumnOrderingVM[] = [];

  public get filteredItems(): any[] {
    if (!this.items) return [];

    let result = this.items.filter((item) => !item.__isHidden);

    if (!StringUtil.isNullOrEmpty(this.searchText)) {
      result = result.filter((item) => item.__searchText.includes(this.searchText!));
    }

    if (this.filterFn) {
      result = result.filter((item, i) => this.filterFn!(i, item));
    }

    for (const orderingItem of this.ordering.reverse()) {
      if (orderingItem.desc) {
        result = result.orderByDesc((item) => item[orderingItem.key]);
      }
      else {
        result = result.orderBy((item) => item[orderingItem.key]);
      }
    }

    return result;
  }

  public constructor(private readonly _sharedData: SdSharedDataRootProvider,
                     private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  private readonly _prevData: Record<string, any> = {};

  public async ngOnInit(): Promise<void> {
    if (this.dataKey === undefined) return;

    this.busyCount++;

    await this._toast.try(async () => {
      this.items = await this._sharedData.getDataAsync(this.dataKey!);
    });

    this.busyCount--;
    this._cdr.markForCheck();

    this._sharedData.on(this.dataKey, () => {
      this._cdr.markForCheck();
    });
  }

  public ngDoCheck(): void {
    if (!ObjectUtil.equal(this.items, this._prevData["items"])) {
      if (this.selectedItem && !this.items?.includes(this.selectedItem)) {
        if (this.selectedItemChange.observed) {
          this.selectedItemChange.emit(undefined);
        }
        else {
          this.selectedItem = undefined;
        }
      }

      this._prevData["items"] = ObjectUtil.clone(this.items);
      this._cdr.markForCheck();
    }

    this._cdr.markForCheck();
  }

  public onSelectedItemChange(item: ISharedDataBase<string | number> | undefined): void {
    if (this.selectedItemChange.observed) {
      this.selectedItemChange.emit(item);
    }
    else {
      this.selectedItem = item;
    }
  }
}

