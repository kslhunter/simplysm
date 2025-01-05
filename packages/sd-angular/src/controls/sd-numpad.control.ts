import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdTextfieldControl } from "./sd-textfield.control";
import { $effect, $signal } from "../utils/hooks";
import { SdButtonControl } from "./sd-button.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdIconControl } from "./sd-icon.control";
import { NumberUtils, StringUtils } from "@simplysm/sd-core-common";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-numpad",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdButtonControl,
    SdIconControl,
  ],
  template: `
    <table>
      <thead>
        <tr>
          <td colspan="3">
            <sd-textfield
              type="text"
              inputClass="tx-right"
              [placeholder]="placeholder()"
              [required]="required()"
              [(value)]="text"
            />
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="2">
            <sd-button
              size="lg"
              theme="danger"
              (click)="onButtonClick('C')"
            >
              <sd-icon [icon]="icons.eraser" />
            </sd-button>
          </td>
          <td>
            <sd-button
              size="lg"
              theme="warning"
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
                <sd-button
                  size="lg"
                  (click)="onButtonClick(((r * 3) + c + 1).toString())"
                >
                  {{ (r * 3) + c + 1 }}
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
    </table>`,
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
  icons = inject(SdAngularConfigProvider).icons;

  #elRef = injectElementRef<HTMLElement>();

  text = $signal<string>();

  placeholder = input<string>();
  value = model<number>();
  required = input(false, { transform: transformBoolean });

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
    }
    else if (key === "BS") {
      this.text.update(v => {
        const str = v?.slice(0, -1);
        return StringUtils.isNullOrEmpty(str) ? undefined : str;
      });
    }
    else {
      this.text.update(v => (v ?? "") + key);
    }
  }
}
