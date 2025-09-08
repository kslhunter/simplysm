import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/SdBusyContainerControl";
import { SdButtonControl } from "../controls/SdButtonControl";
import { SdCheckboxControl } from "../controls/SdCheckboxControl";
import { SdSheetColumnCellTemplateDirective } from "../controls/sheet/directives/SdSheetColumnCellTemplateDirective";
import { SdSheetColumnDirective } from "../controls/sheet/directives/SdSheetColumnDirective";
import { SdSheetControl } from "../controls/sheet/SdSheetControl";
import { ISdSheetConfig } from "../controls/sheet/types/ISdSheetConfig";
import { SdTextfieldControl } from "../controls/SdTextfieldControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { ISdModal } from "../providers/SdModalProvider";
import { $effect } from "../utils/bindings/$effect";
import { $signal } from "../utils/bindings/$signal";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAnchorControl } from "../controls/SdAnchorControl";

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    forwardRef(() => SdSheetControl),
    SdSheetColumnDirective,
    SdCheckboxControl,
    SdTextfieldControl,
    SdSheetColumnCellTemplateDirective,
    SdButtonControl,
    FaIconComponent,
    SdBusyContainerControl,
    SdAnchorControl,
  ],
  template: `
    <sd-busy-container [busy]="!initialized()">
      @if (initialized()) {
        <div class="flex-fill p-default">
          <sd-sheet
            [key]="sheetKey() + '-config'"
            [items]="items()"
            [trackByFn]="trackByFn"
            hideConfigBar
          >
            <sd-sheet-column key="fixed" header="Fix" disableSorting disableResizing>
              <ng-template [cell]="items()" let-item="item">
                <div style="text-align: center">
                  <sd-checkbox
                    size="sm"
                    [inset]="true"
                    [(value)]="item.fixed"
                    (valueChange)="items.$mark()"
                  />
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="ordering" header="Order" disableSorting disableResizing>
              <ng-template [cell]="items()" let-item="item" let-index="index">
                <div class="p-xs-sm" style="text-align: center">
                  <sd-anchor
                    [disabled]="index === 0 || (!item.fixed && items()[index - 1].fixed)"
                    (click)="onDisplayOrderUpButtonClick(item)"
                  >
                    <fa-icon [icon]="icons.angleUp" [fixedWidth]="true" />
                  </sd-anchor>
                  <sd-anchor
                    [disabled]="
                      index === items().length - 1 || (item.fixed && !items()[index + 1].fixed)
                    "
                    (click)="onDisplayOrderDownButtonClick(item)"
                  >
                    <fa-icon [icon]="icons.angleDown" [fixedWidth]="true" />
                  </sd-anchor>
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="header" header="Header" disableSorting>
              <ng-template [cell]="items()" let-item="item">
                <div class="p-xs-sm">
                  {{ item.header }}
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column key="width" header="Width" disableSorting width="60px">
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
            <sd-sheet-column key="hidden" header="Hidden" disableSorting disableResizing>
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
        </div>

        <div class="p-sm-default flex-row gap-sm bdt bdt-theme-grey-lightest">
          <div class="flex-fill align-start">
            <sd-button
              size="sm"
              inline
              theme="warning"
              (click)="onInitButtonClick()"
              buttonStyle="min-width: 60px;"
            >
              Reset
            </sd-button>
          </div>
          <sd-button
            size="sm"
            theme="success"
            (click)="onOkButtonClick()"
            buttonStyle="min-width: 60px;"
          >
            OK
          </sd-button>
          <sd-button size="sm" (click)="onCancelButtonClick()" buttonStyle="min-width: 60px;">
            Cancel
          </sd-button>
        </div>
      }
    </sd-busy-container>
  `,
})
export class SdSheetConfigModal<T> implements ISdModal<ISdSheetConfig> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  sheetKey = input.required<string>();
  controls = input.required<readonly SdSheetColumnDirective<T>[]>();
  config = input.required<ISdSheetConfig | undefined>();

  close = output<ISdSheetConfig | undefined>();

  initialized = $signal(false);
  items = $signal<IItem[]>([]);

  trackByFn = (item: IItem): string => item.key;

  constructor() {
    $effect(() => {
      const items: IItem[] = [];
      for (const control of this.controls()) {
        const config = this.config()?.columnRecord?.[control.key()];

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

      this.items.set(
        items.orderBy((item) => item.displayOrder).orderBy((item) => (item.fixed ? -1 : 0)),
      );

      this.initialized.set(true);
    });
  }

  onDisplayOrderUpButtonClick(item: IItem): void {
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

  onDisplayOrderDownButtonClick(item: IItem): void {
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

    this.close.emit(result);
  }

  onCancelButtonClick(): void {
    this.close.emit(undefined);
  }

  onInitButtonClick(): void {
    if (confirm("설정값이 모두 초기화 됩니다.")) {
      this.close.emit({ columnRecord: {} });
    }
  }
}

interface IItem {
  key: string;
  header: string | undefined;
  disableResizing: boolean;
  fixed: boolean;
  width?: string;
  displayOrder?: number;
  hidden: boolean;
}
