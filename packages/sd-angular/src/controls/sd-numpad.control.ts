import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { NumberUtils, StringUtils } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $effect } from "../utils/bindings/$effect";
import { $signal } from "../utils/bindings/$signal";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdButtonControl } from "./sd-button.control";
import { SdIconControl } from "./sd-icon.control";
import { SdTextfieldControl } from "./sd-textfield.control";

@Component({
  selector: "sd-numpad",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfieldControl, SdButtonControl, SdIconControl],
  template: `
    <table>
      <thead>
        <tr>
          <td [attr.colspan]="useEnterButton() ? 2 : 3">
            <sd-textfield
              type="text"
              inputClass="tx-right ft-size-h3"
              [placeholder]="placeholder()"
              [required]="required()"
              [disabled]="inputDisabled()"
              [(value)]="text"
            />
          </td>
          @if (useEnterButton()) {
            <td>
              <sd-button
                size="lg"
                theme="primary"
                [disabled]="required() && value() == null"
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
              <sd-button size="lg" (click)="onButtonClick('Minus')">-</sd-button>
            </td>
          }
          <td [attr.colspan]="useMinusButton() ? 1 : 2">
            <sd-button size="lg" buttonClass="tx-theme-danger-default" (click)="onButtonClick('C')">
              <sd-icon [icon]="icons.eraser" />
            </sd-button>
          </td>
          <td>
            <sd-button
              size="lg"
              buttonClass="tx-theme-warning-default"
              (click)="onButtonClick('BS')"
            >
              <sd-icon [icon]="icons.arrowLeftLong" />
            </sd-button>
          </td>
        </tr>
        @for (r of [2, 1, 0]; track r) {
          <tr>
            @for (c of [0, 1, 2]; track $index) {
              <td>
                <sd-button size="lg" (click)="onButtonClick((r * 3 + c + 1).toString())">
                  {{ r * 3 + c + 1 }}
                </sd-button>
              </td>
            }
          </tr>
        }
        <tr>
          <td colspan="2">
            <sd-button size="lg" (click)="onButtonClick('0')">0</sd-button>
          </td>
          <td>
            <sd-button size="lg" (click)="onButtonClick('.')">.</sd-button>
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

            > sd-button > button {
              border: none;
            }
          }
        }
      }
    `,
  ],
})
export class SdNumpadControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  text = $signal<string>();

  placeholder = input<string>();
  value = model<number>();

  required = input(false, { transform: transformBoolean });
  inputDisabled = input(false, { transform: transformBoolean });
  useEnterButton = input(false, { transform: transformBoolean });
  useMinusButton = input(false, { transform: transformBoolean });

  enterButtonClick = output();

  constructor() {
    $effect([this.text], () => {
      const newValue = NumberUtils.parseFloat(this.text());
      if (newValue !== this.value()) {
        this.value.set(newValue);
      }
    });

    $effect([this.value], () => {
      const prevValue = NumberUtils.parseFloat(this.text());
      if (prevValue !== this.value()) {
        this.text.set(this.value()?.toString());
      }
    });
  }

  onButtonClick(key: string) {
    if (key === "C") {
      this.text.set(undefined);
    } else if (key === "BS") {
      this.text.update((v) => {
        const str = v?.slice(0, -1);
        return StringUtils.isNullOrEmpty(str) ? undefined : str;
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
}
