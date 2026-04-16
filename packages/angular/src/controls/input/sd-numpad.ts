import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { num, str } from "@simplysm/core-common";
import { SdButton } from "../button/sd-button";
import { SdTextfield } from "./sd-textfield";
import { NgIcon } from "@ng-icons/core";
import { tablerArrowLeft, tablerEraser } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-numpad",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfield, SdButton, NgIcon],
  template: `
    <table>
      <thead>
        <tr>
          <td [attr.colspan]="useEnterButton() ? 2 : 3">
            <sd-textfield
              [type]="'text'"
              [size]="'lg'"
              [inputClass]="'tx-right'"
              [placeholder]="placeholder()"
              [required]="required()"
              [disabled]="inputDisabled()"
              [(value)]="text"
            />
          </td>
          @if (useEnterButton()) {
            <td>
              <sd-button
                [size]="'lg'"
                [theme]="'primary'"
                [disabled]="required() && value() == undefined"
                (click)="onButtonClick('ENT')"
              >
                ENT
              </sd-button>
            </td>
          }
        </tr>
      </thead>
      <tbody>
        <tr>
          @if (useMinusButton()) {
            <td>
              <sd-button [size]="'lg'" (click)="onButtonClick('Minus')">-</sd-button>
            </td>
          }
          <td [attr.colspan]="useMinusButton() ? 1 : 2">
            <sd-button
              [size]="'lg'"
              [buttonClass]="'tx-theme-danger-default'"
              (click)="onButtonClick('C')"
            >
              <ng-icon [svg]="tablerEraser" />
            </sd-button>
          </td>
          <td>
            <sd-button
              [size]="'lg'"
              [buttonClass]="'tx-theme-warning-default'"
              (click)="onButtonClick('BS')"
            >
              <ng-icon [svg]="tablerArrowLeft" />
            </sd-button>
          </td>
        </tr>
        @for (r of [2, 1, 0]; track r) {
          <tr>
            @for (c of [0, 1, 2]; track $index) {
              <td>
                <sd-button [size]="'lg'" (click)="onButtonClick((r * 3 + c + 1).toString())">
                  {{ r * 3 + c + 1 }}
                </sd-button>
              </td>
            }
          </tr>
        }
        <tr>
          <td colspan="2">
            <sd-button [size]="'lg'" (click)="onButtonClick('0')">0</sd-button>
          </td>
          <td>
            <sd-button [size]="'lg'" (click)="onButtonClick('.')">.</sd-button>
          </td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [
    /* language=SCSS */ `
      sd-numpad {
        table {
          width: 100%;
          border-collapse: collapse;

          > * > tr > * {
            border: none;
            padding: var(--gap-xxs);

            > sd-button {
              border: none;
            }
          }
        }
      }
    `,
  ],
})
export class SdNumpad {
  text = signal<string | undefined>(undefined);

  placeholder = input<string>();
  value = model<number>();

  required = input(false, { transform: booleanAttribute });
  inputDisabled = input(false, { transform: booleanAttribute });
  useEnterButton = input(false, { transform: booleanAttribute });
  useMinusButton = input(false, { transform: booleanAttribute });

  enterButtonClick = output();

  constructor() {
    effect(() => {
      const text = this.text();
      const newValue = num.parseFloat(text);
      if (newValue !== untracked(() => this.value())) {
        this.value.set(newValue);
      }
    });

    effect(() => {
      const value = this.value();
      const prevValue = num.parseFloat(untracked(() => this.text()));
      if (prevValue !== value) {
        this.text.set(value?.toString());
      }
    });
  }

  onButtonClick(key: string) {
    if (key === "C") {
      this.text.set(undefined);
    } else if (key === "BS") {
      this.text.update((v) => {
        const sliced = v?.slice(0, -1);
        return str.isNullOrEmpty(sliced) ? undefined : sliced;
      });
    } else if (key === "ENT") {
      this.enterButtonClick.emit();
    } else if (key === "Minus") {
      this.text.update((v) => {
        if (v != null && v[0] === "-") {
          return v.slice(1);
        } else {
          return "-" + (v ?? "");
        }
      });
    } else {
      this.text.update((v) => (v ?? "") + key);
    }
  }

  protected readonly tablerEraser = tablerEraser;
  protected readonly tablerArrowLeft = tablerArrowLeft;
}
