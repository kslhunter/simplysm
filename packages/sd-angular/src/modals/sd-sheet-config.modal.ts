import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdModalBase } from "../providers/sd-modal.provider";
import { SdSheetColumnDirective } from "../directives/sd-sheet-column.directive";
import { ISdSheetConfig, SdSheetControl } from "../controls/sd-sheet.control";
import { SdDockContainerControl } from "../controls/sd-dock-container.control";
import { SdPaneControl } from "../controls/sd-pane.control";
import { SdCheckboxControl } from "../controls/sd-checkbox.control";
import { SdAnchorControl } from "../controls/sd-anchor.control";
import { SdTextfieldControl } from "../controls/sd-textfield.control";
import {
  SdSheetColumnCellTemplateDirective,
} from "../directives/sd-sheet-column-cell.template-directive";
import { SdDockControl } from "../controls/sd-dock.control";
import { SdButtonControl } from "../controls/sd-button.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $effect, $signal } from "../utils/hooks/hooks";
import { SdIconControl } from "../controls/sd-icon.control";

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockContainerControl,
    SdPaneControl,
    forwardRef(() => SdSheetControl),
    SdSheetColumnDirective,
    SdCheckboxControl,
    SdAnchorControl,
    SdTextfieldControl,
    SdSheetColumnCellTemplateDirective,
    SdDockControl,
    SdButtonControl,
    SdIconControl,
  ],
  template: `
    @if (params()) {
      <sd-dock-container>
        <sd-pane class="p-default">
          <sd-sheet
            key="sd-sheet-config-modal"
            [key]="params().sheetKey + '-config'"
            [items]="items()"
            [trackByFn]="trackByFn"
          >
            <sd-sheet-column key="fixed" header="Fix" disableOrdering disableResizing>
              <ng-template [cell]="items()" let-item="item">
                <div style="text-align: center">
                  <sd-checkbox
                    size="sm"
                    [inset]="true"
                    [(value)]="item.fixed"
                    (valueChange)="items.$mark()"
                  ></sd-checkbox>
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="ordering" header="Order" disableOrdering disableResizing>
              <ng-template [cell]="items()" let-item="item" let-index="index">
                <div class="p-xs-sm" style="text-align: center">
                  <sd-anchor
                    [disabled]="index === 0 || (!item.fixed && items()[index - 1].fixed)"
                    (click)="onDisplayOrderUpButtonClick(item)"
                  >
                    <sd-icon [icon]="icons.angleUp" fixedWidth />
                  </sd-anchor>
                  <sd-anchor
                    [disabled]="index === items().length - 1 || (item.fixed && !items()[index + 1].fixed)"
                    (click)="onDisplayOrderDownButtonClick(item)"
                  >
                    <sd-icon [icon]="icons.angleDown" fixedWidth />
                  </sd-anchor>
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="header" header="Header" disableOrdering>
              <ng-template [cell]="items()" let-item="item">
                <div class="p-xs-sm">
                  {{ item.header }}
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="width" header="Width" disableOrdering width="60px">
              <ng-template [cell]="items()" let-item="item">
                @if (!item.disableResizing) {
                  <sd-textfield
                    type="text"
                    size="sm"
                    [inset]="true"
                    [(value)]="item.width"
                    (valueChange)="items.$mark()"
                  />
                }
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="hidden" header="Hidden" disableOrdering disableResizing>
              .
              <ng-template [cell]="items()" let-item="item">
                <div style="text-align: center">
                  <sd-checkbox
                    size="sm"
                    [inset]="true"
                    [(value)]="item.hidden"
                    (valueChange)="items.$mark()"
                    [icon]="icons.xmark"
                    theme="danger"
                  ></sd-checkbox>
                </div>
              </ng-template>
            </sd-sheet-column>
          </sd-sheet>
        </sd-pane>

        <sd-dock position="bottom" class="p-sm-default pt-0">
          <div style="float: left">
            <sd-button
              [inline]="true"
              theme="warning"
              (click)="onInitButtonClick()"
              buttonStyle="min-width: 60px;"
            >
              Reset
            </sd-button>
          </div>
          <div class="flex-row flex-gap-sm" style="justify-content: end">
            <sd-button
              [inline]="true"
              theme="success"
              (click)="onOkButtonClick()"
              buttonStyle="min-width: 60px;"
            >
              OK
            </sd-button>
            <sd-button
              [inline]="true"
              (click)="onCancelButtonClick()"
              buttonStyle="min-width: 60px;"
            >Cancel
            </sd-button>
          </div>
        </sd-dock>
      </sd-dock-container>
    }
  `,
})
export class SdSheetConfigModal<T> extends SdModalBase<ISdSheetConfigModalInput<T>, ISdSheetConfig> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  items = $signal<IItemVM[]>([]);

  trackByFn = (item: IItemVM, index: number): string => item.key;

  constructor() {
    super();

    $effect(() => {
      const items: IItemVM[] = [];
      for (const control of this.params().controls) {
        const config = this.params().config?.columnRecord?.[control.key()];

        items.push({
          key: control.key(),
          header:
            control.header() instanceof Array
              ? (control.header() as string[]).join(" > ")
              : (control.header() as string),
          disableResizing: control.disableResizing(),
          fixed: config?.fixed ?? control.fixed(),
          displayOrder: config?.displayOrder,
          width: config?.width ?? control.width(),
          hidden: config?.hidden ?? control.hidden(),
        });
      }

      this.items.set(items.orderBy((item) => item.displayOrder)
        .orderBy((item) => (item.fixed ? -1 : 0)));

      this.open();
    });
  }

  onDisplayOrderUpButtonClick(item: IItemVM): void {
    this.items.update((v) => {
      const r = [...v];
      const index = r.indexOf(item);
      r.remove(item);
      r.insert(index - 1, item);

      for (let i = 0; i < r.length; i++) {
        r[i].displayOrder = i;
      }
      return r;
    });
  }

  onDisplayOrderDownButtonClick(item: IItemVM): void {
    this.items.update((v) => {
      const r = [...v];
      const index = r.indexOf(item);
      r.remove(item);
      r.insert(index + 1, item);

      for (let i = 0; i < r.length; i++) {
        r[i].displayOrder = i;
      }
      return r;
    });
  }

  onOkButtonClick(): void {
    const result: ISdSheetConfig = { columnRecord: {} };
    for (const config of this.items()) {
      result.columnRecord![config.key] = {
        fixed: config.fixed,
        width: config.width,
        displayOrder: config.displayOrder,
        hidden: config.hidden,
      };
    }

    this.close(result);
  }

  onCancelButtonClick(): void {
    this.close();
  }

  onInitButtonClick(): void {
    if (confirm("설정값이 모두 초기화 됩니다.")) {
      this.close({ columnRecord: {} });
    }
  }
}

export interface ISdSheetConfigModalInput<T> {
  sheetKey: string;
  controls: readonly SdSheetColumnDirective<T>[];
  config: ISdSheetConfig | undefined;
}

interface IItemVM {
  key: string;
  header: string | undefined;
  disableResizing: boolean;
  fixed: boolean;
  width?: string;
  displayOrder?: number;
  hidden: boolean;
}
