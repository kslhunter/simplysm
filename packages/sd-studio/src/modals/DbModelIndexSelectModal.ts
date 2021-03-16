import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SdModalBase } from "@simplysm/sd-angular";
import { IIndexVM, IModelVM } from "../commons";

@Component({
  selector: "app-db-model-index-selector-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="!isOpened" style="min-width: 400px">
      <sd-dock-container>
        <sd-dock position="top" class="sd-padding-sm-default sd-border-bottom-brightness-default">
          <sd-button size="sm" inline (click)="onAddButtonClick()">
            <sd-icon icon="plus" fixedWidth></sd-icon>
            추가
          </sd-button>
        </sd-dock>

        <sd-pane>
          <sd-sheet key="db-model-index-selector-sheet"
                    [items]="data"
                    [trackByFn]="trackByColumnIdFn"
                    *ngIf="isOpened" inset>
            <sd-sheet-column fixed resizable key="primaryKey" width.px="30">
              <ng-template #header>
                <sd-sheet-cell>
                  <sd-icon icon="times" fixedWidth></sd-icon>
                </sd-sheet-cell>
              </ng-template>
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-sheet-cell style="text-align: center">
                  <sd-anchor (click)="onRemoveButtonClick(item)">
                    <sd-icon icon="times" fixedWidth></sd-icon>
                  </sd-anchor>
                </sd-sheet-cell>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column header="순서" width.px="40">
              <ng-template #cell let-item="item" let-index="index">
                <div class="sd-padding-xs-sm">
                  <sd-anchor [disabled]="index === 0" (click)="onOrderUpButtonClick(item)">
                    <sd-icon icon="angle-up" fixedWidth></sd-icon>
                  </sd-anchor>
                  <sd-anchor [disabled]="index === data.length - 1" (click)="onOrderDownButtonClick(item)">
                    <sd-icon icon="angle-down" fixedWidth></sd-icon>
                  </sd-anchor>
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column [header]="model.className + ' 컬럼'" resizable key="column" width.px="200">
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-select [(value)]="item.columnId" required inset size="sm">
                  <ng-template #header>
                    <div class="sd-border-bottom-brightness-default">
                      <sd-textfield inset placeholder="검색어"></sd-textfield>
                    </div>
                  </ng-template>
                  <sd-select-item *ngFor="let column of model.columns; trackBy: trackByIdFn"
                                  [value]="column.id">
                    {{ column.name }}
                  </sd-select-item>
                </sd-select>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column header="정렬" resizable key="orderBy" width.px="60">
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-select [(value)]="item.orderBy" required inset size="sm">
                  <sd-select-item value="ASC">ASC</sd-select-item>
                  <sd-select-item value="DESC">DESC</sd-select-item>
                </sd-select>
              </ng-template>
            </sd-sheet-column>
          </sd-sheet>
        </sd-pane>

        <sd-dock position="bottom" class="sd-padding-sm-default sd-border-top-brightness-default"
                 style="text-align: right">
          <sd-button theme="primary" size="sm" inline
                     (click)="onSubmitButtonClick()">
            <sd-icon icon="check" fixedWidth></sd-icon>
            확인
          </sd-button>
        </sd-dock>
      </sd-dock-container>
    </sd-busy-container>`
})
export class DbModelIndexSelectModal extends SdModalBase<{ model: IModelVM; idx: IIndexVM }, { columnId: number | undefined; order: number; orderBy: "ASC" | "DESC" }[]> {
  public isOpened = false;

  public data: { columnId: number | undefined; orderBy: "ASC" | "DESC" }[] = [];

  public model?: IModelVM;

  public trackByIdFn = (index: number, item: any): any => item.id ?? item;
  public trackByColumnIdFn = (index: number, item: any): any => item.columnId ?? item;

  public sdOnOpen(param: { model: IModelVM; idx: IIndexVM }): void {
    this.data = param.idx.columns.orderBy((item) => item.order);

    this.model = param.model;

    this.isOpened = true;
  }

  public onAddButtonClick(): void {
    this.data.push({
      columnId: undefined,
      orderBy: "ASC"
    });
  }

  public onRemoveButtonClick(item: { columnId: number | undefined; orderBy: "ASC" | "DESC" }): void {
    this.data.remove(item);
  }

  public onOrderUpButtonClick(item: { columnId: number | undefined; orderBy: "ASC" | "DESC" }): void {
    const i = this.data.indexOf(item);
    const prevItem = this.data[i - 1];
    this.data[i - 1] = item;
    this.data[i] = prevItem;
  }

  public onOrderDownButtonClick(item: { columnId: number | undefined; orderBy: "ASC" | "DESC" }): void {
    const i = this.data.indexOf(item);
    const nextItem = this.data[i + 1];
    this.data[i + 1] = item;
    this.data[i] = nextItem;
  }

  public onSubmitButtonClick(): void {
    this.close(this.data.map((item, i) => ({
      ...item,
      order: i + 1
    })));
  }
}