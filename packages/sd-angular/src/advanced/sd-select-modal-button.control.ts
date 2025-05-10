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
import { $computed, $model } from "../utils/hooks/hooks";
import { transformBoolean } from "../utils/type-tramsforms";
import { TSelectValue } from "../controls/sd-select-control";
import { SdAdditionalButtonControl } from "../controls/sd-additional-button.control";
import { SdIconControl } from "../controls/sd-icon.control";
import { SdButtonControl } from "../controls/sd-button.control";
import { SdAnchorControl } from "../controls/sd-anchor.control";
import { SdInvalidDirective } from "../directives/sd-invalid.directive";

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
    SdInvalidDirective,
  ],
  template: `
    <sd-additional-button
      [inset]="inset()" [size]="size()"
      [sd-invalid]="required() && !__value() ? '값을 입력하세요.' : undefined"
    >
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
export class SdSelectModalButtonControl<
  TMODAL extends SdModalBase<ISelectModalInputParam, ISelectModalOutputResult>,
  M extends keyof TSelectValue<any>,
> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdModal = inject(SdModalProvider);

  __value = input<TSelectValue<number | undefined>[M] | undefined>(undefined, { alias: "value" });
  __valueChange = output<TSelectValue<number | undefined>[M] | undefined>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  selectMode = input("single" as M);

  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  modalType = input<Type<TMODAL>>();
  modalHeader = input<string>();

  isNoValue = $computed(() => {
    return this.value() == null
      || (this.selectMode() === "multi" && (this.value() as any[]).length === 0);
  });

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.modalType()) return;

    const result = await this._sdModal.showAsync(
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
