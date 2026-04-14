import {
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import type { SdModalContentDef } from "../../core/modal/sd-modal.provider";
import type { SdSheetConfig } from "./types";
import type { SdSheetColumn } from "./sd-sheet-column";
import { SdSheet } from "./sd-sheet";
import { SdSheetColumn as SdSheetColumnDir } from "./sd-sheet-column";
import { SdSheetColumnCellTemplate } from "./sd-sheet-column-cell-template";
import { SdButton } from "../../controls/button/sd-button";
import { SdCheckbox } from "../../controls/checkbox/sd-checkbox";
import { SdTextfield } from "../../controls/input/sd-textfield";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdBusyContainer } from "../../core/busy/sd-busy-container";
import { NgIcon } from "@ng-icons/core";
import { tablerChevronUp, tablerChevronDown, tablerX } from "@ng-icons/tabler-icons";
import { mark } from "../../core/mark";

interface ConfigItem {
  key: string;
  header: string;
  disableResizing: boolean;
  fixed: boolean;
  hidden: boolean;
  width: string | undefined;
  ordering: number | undefined;
}

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    forwardRef(() => SdSheet),
    SdSheetColumnDir,
    SdSheetColumnCellTemplate,
    SdButton,
    SdCheckbox,
    SdTextfield,
    SdAnchor,
    SdBusyContainer,
    NgIcon,
  ],
  template: `
    <sd-busy-container [busy]="!initialized()">
      @if (initialized()) {
        <div class="flex-fill p-default">
          <sd-sheet
            [key]="sheetKey() + '-config'"
            [items]="items()"
            [trackByFn]="trackByFn"
            [hideConfigBar]="true"
          >
            <sd-sheet-column
              [key]="'fixed'"
              [header]="'Fix'"
              [disableSorting]="true"
              [disableResizing]="true"
            >
              <ng-template [cell]="items()" let-item="item">
                <div style="text-align: center">
                  <sd-checkbox
                    [size]="'sm'"
                    [inset]="true"
                    [(value)]="item.fixed"
                    (valueChange)="mark(items)"
                  />
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column
              [key]="'ordering'"
              [header]="'Order'"
              [disableSorting]="true"
              [disableResizing]="true"
            >
              <ng-template [cell]="items()" let-item="item" let-index="index">
                <div class="p-xs-sm" style="text-align: center">
                  <sd-anchor
                    [disabled]="index === 0 || (!item.fixed && items()[index - 1].fixed)"
                    (click)="onMoveUp(item)"
                  >
                    <ng-icon [svg]="tablerChevronUp" />
                  </sd-anchor>
                  <sd-anchor
                    [disabled]="index === items().length - 1 || (item.fixed && !items()[index + 1].fixed)"
                    (click)="onMoveDown(item)"
                  >
                    <ng-icon [svg]="tablerChevronDown" />
                  </sd-anchor>
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column [key]="'header'" [header]="'Header'" [disableSorting]="true">
              <ng-template [cell]="items()" let-item="item">
                <div class="p-xs-sm">
                  {{ item.header }}
                </div>
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column
              [key]="'width'"
              [header]="'Width'"
              [disableSorting]="true"
              [width]="'60px'"
            >
              <ng-template [cell]="items()" let-item="item">
                @if (!item.disableResizing) {
                  <sd-textfield
                    [type]="'text'"
                    [size]="'sm'"
                    [inset]="true"
                    [(value)]="item.width"
                    (valueChange)="mark(items)"
                  />
                }
              </ng-template>
            </sd-sheet-column>
            <sd-sheet-column
              [key]="'hidden'"
              [header]="'Hidden'"
              [disableSorting]="true"
              [disableResizing]="true"
            >
              <ng-template [cell]="items()" let-item="item">
                <div style="text-align: center">
                  <sd-checkbox
                    [size]="'sm'"
                    [inset]="true"
                    [(value)]="item.hidden"
                    (valueChange)="mark(items)"
                    [icon]="tablerX"
                    [theme]="'danger'"
                  />
                </div>
              </ng-template>
            </sd-sheet-column>
          </sd-sheet>
        </div>

        <div class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">
          <div class="flex-fill align-start">
            <sd-button
              [size]="'sm'"
              [inline]="true"
              [theme]="'warning'"
              (click)="onResetClick()"
            >
              Reset
            </sd-button>
          </div>
          <sd-button
            [size]="'sm'"
            [theme]="'success'"
            (click)="onOkClick()"
          >
            OK
          </sd-button>
          <sd-button
            [size]="'sm'"
            (click)="onCancelClick()"
          >
            Cancel
          </sd-button>
        </div>
      }
    </sd-busy-container>
  `,
})
export class SdSheetConfigModal implements SdModalContentDef<SdSheetConfig | undefined> {
  initialized = signal(false);
  close = output<SdSheetConfig | undefined>();

  sheetKey = input.required<string>();
  controls = input.required<readonly SdSheetColumn[]>();
  config = input.required<SdSheetConfig | undefined>();

  items = signal<ConfigItem[]>([]);

  trackByFn = (item: ConfigItem): string => item.key;

  protected readonly tablerChevronUp = tablerChevronUp;
  protected readonly tablerChevronDown = tablerChevronDown;
  protected readonly tablerX = tablerX;
  protected readonly mark = mark;

  constructor() {
    effect(() => {
      const cfg = this.config();
      const items: ConfigItem[] = this.controls().map((ctrl): ConfigItem => {
        const key = ctrl.key();
        const cfgCol = cfg?.columnRecord[key];
        return {
          key,
          header: Array.isArray(ctrl.header())
            ? (ctrl.header() as string[]).join(" > ")
            : (ctrl.header() as string),
          disableResizing: ctrl.disableResizing(),
          fixed: cfgCol?.fixed ?? ctrl.fixed(),
          hidden: cfgCol?.hidden ?? ctrl.hidden(),
          width: cfgCol?.width ?? ctrl.width(),
          ordering: cfgCol?.ordering ?? ctrl.ordering(),
        };
      });

      items.sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
      items.sort((a, b) => (a.fixed ? -1 : 0) - (b.fixed ? -1 : 0));

      this.items.set(items);
      this.initialized.set(true);
    });
  }

  onMoveUp(item: ConfigItem): void {
    this.items.update((v) => {
      const r = [...v];
      const index = r.indexOf(item);
      r.splice(index, 1);
      r.splice(index - 1, 0, item);
      for (let i = 0; i < r.length; i++) {
        r[i].ordering = i;
      }
      return r;
    });
  }

  onMoveDown(item: ConfigItem): void {
    this.items.update((v) => {
      const r = [...v];
      const index = r.indexOf(item);
      r.splice(index, 1);
      r.splice(index + 1, 0, item);
      for (let i = 0; i < r.length; i++) {
        r[i].ordering = i;
      }
      return r;
    });
  }

  onOkClick(): void {
    const result: SdSheetConfig = { columnRecord: {} };
    for (const item of this.items()) {
      result.columnRecord[item.key] = {
        fixed: item.fixed,
        width: item.width,
        ordering: item.ordering,
        hidden: item.hidden,
      };
    }
    this.close.emit(result);
  }

  onCancelClick(): void {
    this.close.emit(undefined);
  }

  onResetClick(): void {
    if (confirm("설정값이 모두 초기화 됩니다.")) {
      this.close.emit({ columnRecord: {} });
    }
  }
}
