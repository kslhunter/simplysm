import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SdModalBase } from "@simplysm/sd-angular";
import { IColumnVM, IModelVM } from "../commons";

@Component({
  selector: "app-db-model-fk-column-selector-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="!isOpened" style="min-width: 400px">
      <sd-dock-container>
        <sd-pane>
          <sd-sheet key="db-model-fk-column-selector-sheet"
                    [items]="data"
                    [trackByFn]="trackByTargetPkColumnIdFn"
                    *ngIf="isOpened" inset>
            <sd-sheet-column [header]="targetModel.className + ' PK 컬럼'" resizable key="targetPkColumn">
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-sheet-cell>
                  {{ item.targetPkColumn.name }}
                </sd-sheet-cell>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column width.px="25">
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-sheet-cell style="text-align: center;"
                               class="sd-background-color-grey-lightest sd-text-color-grey-default">
                  <sd-icon icon="arrow-right" fixedWidth></sd-icon>
                </sd-sheet-cell>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column [header]="model.className + ' FK 컬럼'" resizable key="fkColumnId" width.px="200">
              <ng-template #cell let-item="item" let-edit="edit">
                <sd-select [(value)]="item.fkColumnId" required inset size="sm">
                  <ng-template #header>
                    <div class="sd-border-bottom-brightness-default">
                      <sd-textfield inset placeholder="검색어"></sd-textfield>
                    </div>
                  </ng-template>
                  <sd-select-item
                    *ngFor="let column of getUsableColumns(item.targetPkColumn); trackBy: trackByIdFn"
                    [value]="column.id">
                    {{ column.name }}
                  </sd-select-item>
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
export class DbModelFkColumnSelectModal extends SdModalBase<{ model: IModelVM; targetModel: IModelVM; fkColumnIds: (number | undefined)[] }, (number | undefined)[]> {
  public isOpened = false;

  public data: { targetPkColumn: IColumnVM; fkColumnId: number | undefined }[] = [];

  public model?: IModelVM;
  public targetModel?: IModelVM;

  public trackByIdFn = (index: number, item: any): any => item.id;
  public trackByTargetPkColumnIdFn = (index: number, item: any): any => item.targetPkColumn.id;

  public getUsableColumns(targetPkColumn: IColumnVM): IColumnVM[] {
    return this.model!.columns.filter((item) => (
      item.dataType === targetPkColumn.dataType &&
      item.length === targetPkColumn.length &&
      item.precision === targetPkColumn.precision &&
      item.digits === targetPkColumn.digits
    ));
  }

  public sdOnOpen(param: { model: IModelVM; targetModel: IModelVM; fkColumnIds: (number | undefined)[] }): void {
    const targetPkColumns = param.targetModel.columns.filter((item) => item.primaryKey).orderBy((item) => item.primaryKey);

    this.data = targetPkColumns.map((item, i) => ({
      targetPkColumn: item,
      fkColumnId: param.fkColumnIds[i]
    }));

    this.model = param.model;
    this.targetModel = param.targetModel;

    this.isOpened = true;
  }

  public onSubmitButtonClick(): void {
    this.close(this.data.map((item) => item.fkColumnId));
  }
}