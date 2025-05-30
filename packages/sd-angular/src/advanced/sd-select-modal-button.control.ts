import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdAdditionalButtonControl } from "../controls/sd-additional-button.control";
import { SdAnchorControl } from "../controls/sd-anchor.control";
import { SdButtonControl } from "../controls/sd-button.control";
import { SdIconControl } from "../controls/sd-icon.control";
import { TSelectValue } from "../controls/sd-select-control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { ISdModal, ISdModalInput, SdModalProvider } from "../providers/sd-modal.provider";
import { $computed } from "../utils/bindings/$computed";
import { setupInvalid } from "../utils/setups/setup-invalid";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-select-modal-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAdditionalButtonControl, SdIconControl, SdButtonControl, SdAnchorControl],
  template: `
    <sd-additional-button [inset]="inset()" [size]="size()">
      <ng-content />

      @if (!disabled() && !isNoValue()) {
        <sd-anchor (click)="onCancelButtonClick()" theme="danger">
          <sd-icon [icon]="icons.xmark" />
        </sd-anchor>
      }

      @if (!disabled()) {
        <sd-button (click)="onModalButtonClick($event)" inset>
          <sd-icon [icon]="icons.search" />
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
      }
    `,
  ],
})
export class SdSelectModalButtonControl<M extends keyof TSelectValue<any>> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdModal = inject(SdModalProvider);

  value = model<TSelectValue<number | undefined>[M]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  selectMode = input("single" as M);

  modal = input.required<TSdSelectModalInput>();

  isNoValue = $computed(() => {
    return (
      this.value() == null ||
      (this.selectMode() === "multi" && (this.value() as any[]).length === 0)
    );
  });

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = this.modal();
    const result = await this._sdModal.showAsync({
      ...modal,
      inputs: {
        selectMode: this.selectMode(),
        selectedItemKeys: (this.selectMode() === "multi"
          ? (this.value() as any[])
          : [this.value()]
        ).filterExists(),
        ...modal.inputs,
      },
    });

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  onCancelButtonClick() {
    this.value.set(
      (this.selectMode() === "multi" ? [] : undefined) as
        | TSelectValue<number | undefined>[M]
        | undefined,
    );
  }
}

export interface ISdSelectModal extends ISdModal<ISelectModalOutputResult> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}

export type TSdSelectModalInput = ISdModalInput<ISdSelectModal, "selectMode" | "selectedItemKeys">;

export interface ISelectModalOutputResult {
  selectedItemKeys: any[];
}
