import { Component } from "@angular/core";
import { SdModalControlBase } from "../bases/SdModalControlBase";
import { ISdSheetColumnDef } from "../controls2/SdSheetControl";

@Component({
  template: `
        <sd-dock-container class="sd-sheet-column-config">
            <sd-dock position="bottom" class="sd-padding-sm-default sd-text-align-right">
                <sd-button2 (click)="onSubmitButtonClick()" [inline]="true" theme="primary">
                    확인
                </sd-button2>
                <sd-button2 (click)="onCloseButtonClick()" [inline]="true" theme="danger">
                    취소
                </sd-button2>
            </sd-dock>

            <sd-pane>
                <sd-sheet [items]="columns" seqProp="sequence">
                    <sd-sheet-column title="컬럼명">
                        <ng-template #item let-item="item">{{ item.title }}</ng-template>
                    </sd-sheet-column>

                    <sd-sheet-column title="보기" class="sd-text-align-center">
                        <ng-template #item let-item="item">
                            <sd-checkbox [(value)]="item.isVisible"></sd-checkbox>
                        </ng-template>
                    </sd-sheet-column>
                </sd-sheet>
            </sd-pane>
        </sd-dock-container>`
})
export class SdSheetColumnConfigModal extends SdModalControlBase<{ columns: ISdSheetColumnDef[] }, { columns: ISdSheetColumnDef[] }> {
  public columns: ISdSheetColumnDef[] = [];

  public sdBeforeOpen(): void {
    this.columns = Object.clone(this.param.columns, {
      excludes: ["itemTemplateRef", "headerTemplateRef"]
    });
  }

  public onSubmitButtonClick(): void {
    this.close({ columns: this.columns });
  }

  public onCloseButtonClick(): void {
    this.close();
  }
}