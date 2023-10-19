import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
  Input,
  Output,
  TemplateRef
} from "@angular/core";
import {StringUtil} from "@simplysm/sd-core-common";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {ISharedDataBase} from "../../providers/SdSharedDataProvider";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {SdSharedDataItemTemplateContext, SdSharedDataItemTemplateDirective} from "./SdSharedDataItemTemplateDirective";
import {ISdSheetColumnOrderingVM} from "../sheet/SdSheetControl";
import {SdDoCheckHelper} from "../../utils/SdDoCheckHelper";

@Component({
  selector: "sd-shared-data-select-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <sd-dock-container>
        <ng-container *ngIf="headerTemplateRef">
          <sd-dock class="p-default p-bottom-0">
            <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
          </sd-dock>
        </ng-container>
        <sd-dock class="p-default">
          <sd-textfield placeholder="검색어" [(value)]="searchText"></sd-textfield>
        </sd-dock>

        <sd-pane>
          <sd-list inset>
            <sd-list-item *ngIf="useUndefined"
                          [selected]="selectedItem === undefined"
                          (click)="onSelectedItemChange(undefined)"
                          [selectedIcon]="selectedIcon">
              <span class="tx-theme-grey-default">미지정</span>
            </sd-list-item>
            <sd-list-item *ngFor="let item of filteredItems; let index = index; trackBy: trackByFn"
                          [selected]="item === selectedItem"
                          (click)="selectedItem === item ? onSelectedItemChange(undefined) : onSelectedItemChange(item)"
                          [selectedIcon]="selectedIcon">
              <ng-template [ngTemplateOutlet]="itemTemplateRef"
                           [ngTemplateOutletContext]="{$implicit: item, item: item, index: index}"></ng-template>
            </sd-list-item>
          </sd-list>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`
})
export class SdSharedDataSelectViewControl<T extends ISharedDataBase<string | number>> implements DoCheck {
  @Input()
  selectedIcon?: IconProp;

  @Input()
  selectedItem?: T;

  @Output()
  readonly selectedItemChange = new EventEmitter<T>();

  @Input()
  @SdInputValidate(Boolean)
  useUndefined?: boolean;

  @Input()
  @SdInputValidate(Function)
  filterFn?: (index: number, item: T) => boolean;

  @ContentChild("headerTemplate", {static: true})
  headerTemplateRef?: TemplateRef<void>;

  @ContentChild(SdSharedDataItemTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef?: TemplateRef<SdSharedDataItemTemplateContext<T>>;

  @Input()
  items?: T[];

  busyCount = 0;

  trackByFn = (index: number, item: T): (string | number) => item.__valueKey;

  searchText?: string;
  ordering: ISdSheetColumnOrderingVM[] = [];

  get filteredItems(): any[] {
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

  constructor(private readonly _cdr: ChangeDetectorRef) {
  }

  ngDoCheck(): void {
    SdDoCheckHelper.use($ => {

      $.run({value: [this.items, "one"]}, () => {
        this.selectedItem = this.items?.single((item) => item.__valueKey === this.selectedItem?.__valueKey);
      });

    }, this._cdr);
  }

  onSelectedItemChange(item: T | undefined) {
    if (this.selectedItemChange.observed) {
      this.selectedItemChange.emit(item);
    }
    else {
      this.selectedItem = item;
    }
  }
}

