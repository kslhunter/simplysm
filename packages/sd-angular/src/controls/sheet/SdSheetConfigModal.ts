import {ChangeDetectionStrategy, Component} from "@angular/core";
import {SdModalBase} from "../../providers/SdModalProvider";
import {SdSheetColumnDirective} from "./SdSheetColumnDirective";
import {faAngleUp} from "@fortawesome/pro-duotone-svg-icons/faAngleUp";
import {faAngleDown} from "@fortawesome/pro-duotone-svg-icons/faAngleDown";
import {faXmark} from "@fortawesome/pro-solid-svg-icons/faXmark";
import {ISdSheetConfig} from "./SdSheetControl";

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container *ngIf="param">
      <sd-pane class="p-default">
        <sd-sheet [key]="param.sheetKey + '-config'"
                  [items]="items"
                  [trackByFn]="trackByKeyFn">
          <sd-sheet-column header="Fix">
            <ng-template #cell let-item="item">
              <div style="text-align: center">
                <sd-checkbox size="sm" inset [(value)]="item.fixed"></sd-checkbox>
              </div>
            </ng-template>
          </sd-sheet-column>
          <sd-sheet-column header="Order">
            <ng-template #cell let-item="item" let-index="index">
              <div class="p-xs-sm" style="text-align: center">
                <sd-anchor [disabled]="index === 0 || (!item.fixed && !!items[index - 1].fixed)"
                           (click)="onDisplayOrderUpButtonClick(item)">
                  <fa-icon [icon]="icons.fadAngleUp" [fixedWidth]=true></fa-icon>
                </sd-anchor>
                <sd-anchor [disabled]="index === items.length - 1 || (item.fixed && !items[index + 1].fixed)"
                           (click)="onDisplayOrderDownButtonClick(item)">
                  <fa-icon [icon]="icons.fadAngleDown" [fixedWidth]=true></fa-icon>
                </sd-anchor>
              </div>
            </ng-template>
          </sd-sheet-column>
          <sd-sheet-column header="Header" resizable>
            <ng-template #cell let-item="item">
              <div class="p-xs-sm">
                {{ item.header }}
              </div>
            </ng-template>
          </sd-sheet-column>
          <sd-sheet-column header="Width" resizable width="60px">
            <ng-template #cell let-item="item">
              <sd-textfield size="sm" inset [(value)]="item.width" *ngIf="item.resizable"></sd-textfield>
            </ng-template>
          </sd-sheet-column>
          <sd-sheet-column header="Hidden">
            <ng-template #cell let-item="item">
              <div style="text-align: center">
                <sd-checkbox size="sm" inset [(value)]="item.hidden" [icon]="icons.fasXmark"
                             theme="danger"></sd-checkbox>
              </div>
            </ng-template>
          </sd-sheet-column>
        </sd-sheet>
      </sd-pane>

      <sd-dock position="bottom" class="p-sm-default pt-0">
        <div style="float: left">
          <sd-button inline theme="warning" (click)="onInitButtonClick()" button.style="min-width: 60px;">Reset
          </sd-button>
        </div>
        <div class="flex-column flex-gap-sm justify-content-end">
          <sd-button inline theme="success" (click)="onOkButtonClick()" button.style="min-width: 60px;">OK</sd-button>
          <sd-button inline (click)="onCancelButtonClick()" button.style="min-width: 60px;">Cancel</sd-button>
        </div>
      </sd-dock>
    </sd-dock-container>`
})
export class SdSheetConfigModal<T> extends SdModalBase<ISdSheetConfigModalInput<T>, ISdSheetConfig> {
  public icons = {
    fadAngleUp: faAngleUp,
    fadAngleDown: faAngleDown,
    fasXmark: faXmark
  };

  public param?: ISdSheetConfigModalInput<T>;

  public items: IItemVM[] = [];

  public trackByKeyFn = (index: number, item: any): any => item.key;

  public sdOnOpen(param: ISdSheetConfigModalInput<T>): void {
    this.param = param;

    const items: IItemVM[] = [];
    for (const control of param.controls) {
      if (control.key === undefined) continue;
      const config = param.config?.columnRecord?.[control.key];

      items.push({
        key: control.key,
        header: control.header instanceof Array ? control.header.join(" > ") : control.header,
        resizable: control.resizable ?? false,
        fixed: config?.fixed ?? control.fixed ?? false,
        displayOrder: config?.displayOrder,
        width: config?.width ?? control.width,
        hidden: config?.hidden ?? control.hidden ?? false
      });
    }

    this.items = items.orderBy((item) => item.displayOrder).orderBy((item) => (item.fixed ? -1 : 0));
  }

  public onDisplayOrderUpButtonClick(item: IItemVM): void {
    const index = this.items.indexOf(item);
    this.items.remove(item);
    this.items.insert(index - 1, item);

    for (let i = 0; i < this.items.length; i++) {
      this.items[i].displayOrder = i;
    }
  }

  public onDisplayOrderDownButtonClick(item: IItemVM): void {
    const index = this.items.indexOf(item);
    this.items.remove(item);
    this.items.insert(index + 1, item);

    for (let i = 0; i < this.items.length; i++) {
      this.items[i].displayOrder = i;
    }
  }

  public onOkButtonClick(): void {
    const result: ISdSheetConfig = {columnRecord: {}};
    for (const config of this.items) {
      result.columnRecord![config.key] = {
        fixed: config.fixed,
        width: config.width,
        displayOrder: config.displayOrder,
        hidden: config.hidden
      };
    }

    this.close(result);
  }

  public onCancelButtonClick(): void {
    this.close();
  }

  public onInitButtonClick(): void {
    if (confirm("설정값이 모두 초기화 됩니다.")) {
      this.close({columnRecord: {}});
    }
  }
}

export interface ISdSheetConfigModalInput<T> {
  sheetKey: string;
  controls: SdSheetColumnDirective<T>[];
  config: ISdSheetConfig | undefined;
}

interface IItemVM {
  key: string;
  header: string | undefined;
  resizable: boolean;
  fixed: boolean;
  width?: string;
  displayOrder?: number;
  hidden: boolean;
}
