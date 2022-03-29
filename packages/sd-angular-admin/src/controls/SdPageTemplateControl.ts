import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  HostListener,
  Input,
  TemplateRef,
  ViewChild
} from "@angular/core";
import { myIcons, TXT_CHANGE_IGNORE_CONFIRM } from "../commons";
import {
  ISdSheetColumnOrderingVM,
  ISdSheetItemKeydownEventParam,
  SdDomValidatorRootProvider,
  SdInputValidate,
  SdToastProvider
} from "@simplysm/sd-angular";
import { ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-page-template",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-pane *ngIf="!usable" class="sd-background-color-white">
      <div class="sd-text-color-grey-light sd-padding-xxl" style="font-size: 48px; line-height: 1.5em">
        <fa-icon [icon]="icons.warning | async" [fixedWidth]="true"></fa-icon>
        현재 직원에게 이 메뉴의 사용권한이 없습니다.<br/>
        시스템 관리자에게 문의하세요.
      </div>
    </sd-pane>

    <sd-busy-container [busy]="busyCount > 0" *ngIf="usable">
      <sd-topbar-container>
        <sd-topbar>
          <h4 *ngIf="title">{{ title }}</h4>

          <sd-topbar-menu *ngIf="searchFn" (click)="onDataRefreshButtonClick()">
            <fa-icon [icon]="icons.refresh | async" [fixedWidth]="true"></fa-icon>
            새로고침 <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu>
          <ng-template [ngTemplateOutlet]="topbarMenuTemplateRef"></ng-template>
        </sd-topbar>

        <sd-pane class="sd-padding-default">
          <sd-dock-container>
            <sd-dock class="sd-padding-bottom-default" *ngIf="filterItemTemplateRef && searchFn">
              <sd-card class="sd-padding-default">
                <sd-form layout="inline" (submit)="onSearchFormSubmit()">
                  <sd-form-item>
                    <sd-button type="submit" theme="info">
                      <fa-icon [icon]="icons.search | async" [fixedWidth]="true"></fa-icon>
                      조회
                    </sd-button>
                  </sd-form-item>
                  <ng-template [ngTemplateOutlet]="filterItemTemplateRef"></ng-template>
                </sd-form>
              </sd-card>
            </sd-dock>

            <sd-card class="sd-padding-default" style="height: 100%;">
              <sd-dock-container>
                <sd-dock class="sd-padding-bottom-default" *ngIf="sheetButtonTemplateRef || saveFn || addItemFn">
                  <sd-button inline theme="primary" (click)="onSaveButtonClick()"
                             *ngIf="saveFn && editable">
                    <fa-icon [icon]="icons.save | async" [fixedWidth]="true"></fa-icon>
                    저장 <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-gap width="sm"></sd-gap>
                  <sd-button inline (click)="onAddItemButtonClick()" *ngIf="addItemFn && editable">
                    <fa-icon [icon]="icons.add | async" [fixedWidth]="true"></fa-icon>
                    행 추가 <small>(CTRL+INSERT)</small>
                  </sd-button>
                  <sd-gap width="sm"></sd-gap>
                  <ng-template [ngTemplateOutlet]="sheetButtonTemplateRef"></ng-template>
                </sd-dock>

                <sd-sheet #sheet
                          [key]="key ? (key + '-sheet') : undefined"
                          [items]="items"
                          [trackByFn]="itemTrackByFn"
                          [page]="pagination.page"
                          [pageLength]="pagination.length"
                          (pageChange)="onPageClick($event)"
                          [ordering]="ordering"
                          (orderingChange)="onOrderingChange($event)"
                          (itemKeydown)="onItemKeydown($event)">
                  <sd-sheet-column fixed header="" width.px="40" resizable useOrdering [key]="itemKey">
                    <ng-template #cell let-item="item" let-edit="edit">
                      <sd-sheet-cell [style.text-align]="item.id ? 'right' : 'center'"
                                     [style.background]="getIsItemChanged(item) ? 'yellow' : ''">
                        <span *ngIf="item.id">{{ item.id }}</span>
                        <sd-anchor *ngIf="!item.id && removeItemFn" (click)="onItemRemoveButtonClick(item)">
                          <fa-icon [icon]="icons.xmark | async" [fixedWidth]="true"></fa-icon>
                        </sd-anchor>
                      </sd-sheet-cell>
                    </ng-template>
                  </sd-sheet-column>
                  <ng-template [ngTemplateOutlet]="sheetColumnTemplateRef"></ng-template>
                </sd-sheet>
              </sd-dock-container>
            </sd-card>
          </sd-dock-container>
        </sd-pane>
      </sd-topbar-container>
    </sd-busy-container>`
})
export class SdPageTemplateControl {
  public icons = myIcons;

  @ViewChild("sheet", { read: ElementRef })
  public sheetElRef?: ElementRef;

  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  public usable = false;

  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  public editable = false;

  @Input()
  @SdInputValidate({ type: String })
  public key?: string;

  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public busyCount = 0;

  @Input()
  @SdInputValidate({ type: String })
  public title?: string;

  @ContentChild("topbarMenu", { static: true })
  public topbarMenuTemplateRef?: TemplateRef<void>;

  @ContentChild("filter", { static: true })
  public filterItemTemplateRef?: TemplateRef<void>;

  @ContentChild("sheetButton", { static: true })
  public sheetButtonTemplateRef?: TemplateRef<void>;

  @ContentChild("sheetColumn", { static: true })
  public sheetColumnTemplateRef?: TemplateRef<void>;

  @Input()
  @SdInputValidate({ type: Function, notnull: true })
  public itemTrackByFn = (i: number, item: any): any => item;

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: any[] = [];

  @Input()
  @SdInputValidate({ type: Function })
  public searchFn?: (filter: any, pagination: { page: number; length: number }, ordering: ISdSheetColumnOrderingVM[]) => PromiseLike<number>;

  @Input()
  @SdInputValidate({ type: Function })
  public addItemFn?: () => void;

  @Input()
  @SdInputValidate({ type: Function })
  public removeItemFn?: (item: any) => void;

  @Input()
  @SdInputValidate({ type: Function })
  public saveFn?: () => Promise<void>;

  @Input()
  @SdInputValidate({ type: String, notnull: true })
  public itemKey = "id";

  @Input()
  @SdInputValidate({ type: Object })
  public filter?: Record<string, any>;

  public orgItemMap = new Map<any, any>();
  public lastFilter?: Record<string, any>;

  public pagination = { page: 0, length: 0 };
  public ordering: ISdSheetColumnOrderingVM[] = [];

  public getIsItemChanged(item: any): boolean {
    if (item.id === undefined) return true;

    const orgItem = this.orgItemMap.get(item[this.itemKey]);
    return !ObjectUtil.equal(orgItem, item);
  }

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _domValidator: SdDomValidatorRootProvider) {
  }

  public async onSearchFormSubmit(): Promise<void> {
    if (!this.usable) return;
    if (!this.searchFn) return;

    const diffs = this.items.oneWayDiffs(this.orgItemMap, this.itemKey);
    if (diffs.length > 0 && !confirm(TXT_CHANGE_IGNORE_CONFIRM)) {
      return;
    }

    this.pagination = { page: 0, length: 0 };
    this.lastFilter = ObjectUtil.clone(this.filter);

    this.busyCount++;
    await this._toast.try(async () => {
      await this._searchAsync();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  public async onPageClick(page: number): Promise<void> {
    if (!this.usable) return;
    if (!this.searchFn) return;

    const diffs = this.items.oneWayDiffs(this.orgItemMap, this.itemKey);
    if (diffs.length > 0 && !confirm(TXT_CHANGE_IGNORE_CONFIRM)) {
      return;
    }

    this.pagination.page = page;

    this.busyCount++;
    await this._toast.try(async () => {
      await this._searchAsync();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }


  public async onOrderingChange(ordering: ISdSheetColumnOrderingVM[]): Promise<void> {
    if (!this.usable) return;
    if (!this.searchFn) return;

    const diffs = this.items.oneWayDiffs(this.orgItemMap, this.itemKey);
    if (diffs.length > 0 && !confirm(TXT_CHANGE_IGNORE_CONFIRM)) {
      return;
    }

    this.ordering = ordering;

    this.busyCount++;
    await this._toast.try(async () => {
      await this._searchAsync();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  @HostListener("sdDataRefresh")
  public async onDataRefreshButtonClick(): Promise<void> {
    if (this.busyCount > 0) return;
    if (!this.usable) return;
    if (!this.searchFn) return;

    const diffs = this.items.oneWayDiffs(this.orgItemMap, this.itemKey);
    if (diffs.length > 0 && !confirm(TXT_CHANGE_IGNORE_CONFIRM)) {
      return;
    }

    this.busyCount++;
    await this._toast.try(async () => {
      await this._searchAsync();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  private async _searchAsync(): Promise<void> {
    const totalCount = await this.searchFn!(this.lastFilter, this.pagination, this.ordering);
    this.orgItemMap = ObjectUtil.clone(this.items).toMap((item) => item[this.itemKey]!);
    this.pagination.length = Math.ceil(totalCount / 50);
  }

  public onAddItemButtonClick(): void {
    if (!this.editable) return;
    if (!this.addItemFn) return;

    this.addItemFn();
  }

  public onItemRemoveButtonClick(item: any): void {
    if (!this.editable) return;
    if (!this.removeItemFn) return;

    this.removeItemFn(item);
  }

  public onItemKeydown(param: ISdSheetItemKeydownEventParam<any>): void {
    if (!this.editable) return;

    if (
      param.event.ctrlKey
      && !param.event.altKey
      && !param.event.shiftKey
      && param.event.key === "Delete"
    ) {
      param.event.preventDefault();
      param.event.stopPropagation();

      if (this.removeItemFn) {
        this.removeItemFn(param.item);
      }
    }
    else if (
      param.event.ctrlKey
      && !param.event.altKey
      && !param.event.shiftKey
      && param.event.key === "Insert"
    ) {
      param.event.preventDefault();
      param.event.stopPropagation();

      this.onAddItemButtonClick();
    }
  }

  @HostListener("sdSave")
  public async onSaveButtonClick(): Promise<void> {
    if (this.busyCount > 0) return;
    if (!this.editable) return;
    if (!this.saveFn) return;

    const diffs = this.items.oneWayDiffs(this.orgItemMap, this.itemKey);
    if (diffs.length === 0) {
      this._toast.info("변경사항이 없습니다.");
    }

    this.busyCount++;
    await this._toast.try(async () => {
      await this._saveAsync();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  private async _saveAsync(): Promise<void> {
    this._domValidator.validate(this.sheetElRef!.nativeElement);

    await this.saveFn!();

    await this._searchAsync();

    this._toast.success("저장되었습니다.");
  }
}
