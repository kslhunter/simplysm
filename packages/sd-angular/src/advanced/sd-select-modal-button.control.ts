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
import { SdAnchorControl } from "../controls/sd-anchor.control";

@Component({
  selector: "sd-select-modal-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAdditionalButtonControl,
    SdIconControl,
    SdButtonControl,
    SdAnchorControl,
  ],
  template: `
    <sd-additional-button [inset]="inset()" [size]="size()">
      <ng-content />
      <div class="_invalid-indicator"></div>

      @if (!disabled() && value() != null) {
        <sd-anchor (click)="onCancelButtonClick()" theme="danger">
          <sd-icon [icon]="icons.xmark" fixedWidth/>
        </sd-anchor>
      }

      @if (!disabled()) {
        <sd-button (click)="onModalButtonClick($event)" inset>
          <sd-icon [icon]="icons.search" fixedWidth/>
        </sd-button>
      }
    </sd-additional-button>
  `,
  styles: [
    /* language=SCSS */ `
      sd-select-modal-button {
        display: block;
        width: 100%;
        min-width: 10em;

        > sd-additional-button > ._content {
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

        &[sd-invalid] {
          > sd-additional-button > ._content > ._invalid-indicator {
            display: block;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-invalid]": "required() && !_value() ? '필수값이 입력되지 않았습니다.' : undefined",
  },
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

  onCancelButtonClick() {
    this.value.set((
      this.selectMode() === "multi" ? [] : undefined
    ) as TSelectValue<number | undefined>[M] | undefined);
  }
}

export interface ISelectModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISelectModalOutputResult {
  selectedItemKeys: any[];
}
