import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../providers/sd-modal.provider";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $model } from "../utils/hooks";
import { transformBoolean } from "../utils/type-tramsforms";
import { TSelectValue } from "../controls/sd-select-control";
import { SdAdditionalButtonControl } from "../controls/sd-additional-button.control";
import { SdIconControl } from "../controls/sd-icon.control";
import { SdButtonControl } from "../controls/sd-button.control";

@Component({
  selector: "sd-select-modal-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAdditionalButtonControl,
    SdIconControl,
    SdButtonControl,
  ],
  template: `
    <sd-additional-button [inset]="inset()" [size]="size()">
      <ng-content />
      <div class="_invalid-indicator"></div>

      <sd-button
        (click)="onModalButtonClick($event)"
        [disabled]="disabled()"
        inset
      >
        <sd-icon [icon]="icons.search" />
      </sd-button>
    </sd-additional-button>
  `,
  styles: [
    /* language=SCSS */ `
      sd-select-modal-button {
        > sd-additional-button > div {
          position: relative;

          > ._invalid-indicator {
            display: none;
            //display: block;
            position: absolute;
            z-index: 9999;
            background: var(--theme-danger-default);

            top: var(--gap-xs);
            left: var(--gap-xs);
            border-radius: 100%;
            width: var(--gap-sm);
            height: var(--gap-sm);
          }
        }
        
        &[sd-invalid=true] {
          > sd-additional-button > div > ._invalid-indicator {
            display: block;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-invalid]": "required() && !_value()"
  }
})
export class SdSelectModalButtonControl<
  TMODAL extends SdModalBase<ISelectModalInputParam, ISelectModalOutputResult>,
  M extends keyof TSelectValue<any>,
> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  _value = input<TSelectValue<number | undefined>[M] | undefined>(undefined, { alias: "value" });
  _valueChange = output<TSelectValue<number | undefined>[M] | undefined>({ alias: "valueChange" });
  value = $model(this._value, this._valueChange);

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  selectMode = input("single" as M);

  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.modalType()) return;

    const result = await this.#sdModal.showAsync(
      this.modalType()!,
      this.modalHeader() ?? "자세히...",
      {
        selectMode: this.selectMode(),
        selectedItemKeys: (this.selectMode() === "multi"
          ? (this.value() as any[])
          : [this.value()]).filterExists(),
        ...this.modalInputParam(),
      },
    );

    if (result) {
      const newValue = this.selectMode() === "multi"
        ? result.selectedItemKeys
        : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }
}

export interface ISelectModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISelectModalOutputResult {
  selectedItemKeys: any[];
}
