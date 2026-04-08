import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import type { SdModalContentDef } from "../../overlay/modal/sd-modal.provider";
import type { SdSheetConfig } from "./types";
import type { SdSheetColumn } from "./sd-sheet-column";
import { SdButton } from "../../form/button/sd-button";
import { SdCheckbox } from "../../form/checkbox/sd-checkbox";
import { NgIcon } from "@ng-icons/core";
import { tablerArrowUp, tablerArrowDown } from "@ng-icons/tabler-icons";

interface ConfigItem {
  key: string;
  header: string;
  fixed: boolean;
  hidden: boolean;
  width: string;
  ordering: number;
}

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [SdButton, SdCheckbox, NgIcon],
  template: `
    <div class="_sd-sheet-config-modal">
      <table class="_config-table">
        <thead>
          <tr>
            <th>Fix</th>
            <th>Order</th>
            <th>Header</th>
            <th>Width</th>
            <th>Hidden</th>
          </tr>
        </thead>
        <tbody>
          @for (item of _items(); track item.key; let idx = $index) {
            <tr>
              <td>
                <sd-checkbox
                  [value]="item.fixed"
                  (click)="onFixedToggle(idx)"
                  [inline]="true"
                  [inset]="true"
                />
              </td>
              <td class="_order-col">
                <sd-button
                  [disabled]="!canMoveUp(idx)"
                  (click)="onMoveUp(idx)"
                >
                  <ng-icon [svg]="_icons.tablerArrowUp" />
                </sd-button>
                <sd-button
                  [disabled]="!canMoveDown(idx)"
                  (click)="onMoveDown(idx)"
                >
                  <ng-icon [svg]="_icons.tablerArrowDown" />
                </sd-button>
              </td>
              <td>{{ item.header }}</td>
              <td>
                <input
                  type="text"
                  class="_width-input"
                  [value]="item.width"
                  (input)="onWidthChange(idx, $event)"
                />
              </td>
              <td>
                <sd-checkbox
                  [value]="item.hidden"
                  (click)="onHiddenToggle(idx)"
                  [inline]="true"
                  [inset]="true"
                />
              </td>
            </tr>
          }
        </tbody>
      </table>
      <div class="_actions">
        <sd-button [theme]="'primary'" (click)="onOk()">OK</sd-button>
        <sd-button (click)="onCancel()">Cancel</sd-button>
        <sd-button (click)="onReset()">Reset</sd-button>
      </div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-sheet-config-modal {
        display: block;
        padding: var(--gap-default);

        > ._sd-sheet-config-modal {
          > ._config-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: var(--gap-default);

            th,
            td {
              border: 1px solid var(--trans-lighter);
              padding: var(--gap-sm) var(--gap-default);
              text-align: left;
            }

            th {
              background: var(--theme-secondary-lightest);
              font-weight: bold;
            }

            ._order-col {
              white-space: nowrap;
            }

            ._width-input {
              width: 80px;
              padding: 2px 4px;
              border: 1px solid var(--trans-lighter);
            }
          }

          > ._actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--gap-sm);
          }
        }
      }
    `,
  ],
})
export class SdSheetConfigModal implements SdModalContentDef<SdSheetConfig | undefined> {
  initialized = signal(true);
  close = output<SdSheetConfig | undefined>();

  controls = input.required<readonly SdSheetColumn[]>();
  config = input.required<SdSheetConfig | undefined>();

  _icons = { tablerArrowUp, tablerArrowDown };

  private readonly _initialItems = computed((): ConfigItem[] => {
    const cfg = this.config();
    const controls = this.controls();
    return controls
      .map((ctrl): ConfigItem => {
        const key = ctrl.key();
        const cfgCol = cfg?.columnRecord[key];
        return {
          key,
          header: Array.isArray(ctrl.header()) ? (ctrl.header() as string[]).join(" > ") : (ctrl.header() as string),
          fixed: cfgCol?.fixed ?? ctrl.fixed(),
          hidden: cfgCol?.hidden ?? ctrl.hidden(),
          width: cfgCol?.width ?? ctrl.width() ?? "",
          ordering: cfgCol?.ordering ?? ctrl.ordering(),
        };
      })
      .sort((a, b) => a.ordering - b.ordering);
  });

  _items = linkedSignal<ConfigItem[]>(() => this._initialItems());

  onFixedToggle(idx: number): void {
    const items = [...this._items()];
    items[idx] = { ...items[idx], fixed: !items[idx].fixed };
    this._items.set(items);
  }

  onHiddenToggle(idx: number): void {
    const items = [...this._items()];
    items[idx] = { ...items[idx], hidden: !items[idx].hidden };
    this._items.set(items);
  }

  onWidthChange(idx: number, event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const items = [...this._items()];
    items[idx] = { ...items[idx], width: inputEl.value };
    this._items.set(items);
  }

  canMoveUp(idx: number): boolean {
    if (idx <= 0) return false;
    const items = this._items();
    const current = items[idx];
    const above = items[idx - 1];
    // Cannot move non-fixed above fixed
    if (!current.fixed && above.fixed) return false;
    return true;
  }

  canMoveDown(idx: number): boolean {
    const items = this._items();
    if (idx >= items.length - 1) return false;
    const current = items[idx];
    const below = items[idx + 1];
    // Cannot move fixed below non-fixed
    if (current.fixed && !below.fixed) return false;
    return true;
  }

  onMoveUp(idx: number): void {
    if (!this.canMoveUp(idx)) return;
    const items = [...this._items()];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    this._items.set(items);
  }

  onMoveDown(idx: number): void {
    if (!this.canMoveDown(idx)) return;
    const items = [...this._items()];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    this._items.set(items);
  }

  onOk(): void {
    const items = this._items();
    const columnRecord: SdSheetConfig["columnRecord"] = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      columnRecord[item.key] = {
        fixed: item.fixed,
        hidden: item.hidden,
        width: item.width !== "" ? item.width : undefined,
        ordering: i,
      };
    }
    this.close.emit({ columnRecord });
  }

  onCancel(): void {
    this.close.emit(undefined);
  }

  onReset(): void {
    this.close.emit({ columnRecord: {} });
  }
}
