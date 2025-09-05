import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAdditionalButtonControl } from "../../controls/sd-additional-button.control";
import { TSelectModeValue } from "../../controls/select/sd-select.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdModalProvider } from "../../providers/sd-modal.provider";
import { transformBoolean } from "../../utils/type-tramsforms";
import { $computed } from "../../utils/bindings/$computed";
import { setupInvalid } from "../../utils/setups/setup-invalid";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SdButtonControl } from "../../controls/sd-button.control";
import { ISdSelectModal, TSdSelectModalInfo } from "../sd-data-view/sd-data-select-button.control";

@Component({
  selector: "sd-modal-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAdditionalButtonControl, FaIconComponent, SdAnchorControl, SdButtonControl],
  template: `
    <sd-additional-button [inset]="inset()" [size]="size()">
      <ng-content />

      @if (!disabled() && !isNoValue() && !required()) {
        <sd-anchor theme="danger" (click)="onCancelButtonClick()">
          <fa-icon [icon]="icons.eraser" />
        </sd-anchor>
      }

      @if (!disabled()) {
        <sd-button (click)="onModalButtonClick($event)" inset>
          <fa-icon [icon]="searchIcon()" />
        </sd-button>
      }
    </sd-additional-button>
  `,
  styles: [
    /* language=SCSS */ `
      sd-modal-select-button {
        display: block;
        width: 100%;
        min-width: 3em;
      }
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdModalSelectButton<
  T extends object,
  K,
  M extends keyof TSelectModeValue<K> = keyof TSelectModeValue<K>,
> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  modal = input.required<TSdSelectModalInfo<ISdSelectModal<T>>>();

  value = model<TSelectModeValue<K>[M]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);

  searchIcon = input(this.icons.search);

  isNoValue = $computed(() => {
    return (
      this.value() == null ||
      (this.selectMode() === "multi" && (this.value() as any[]).length === 0)
    );
  });

  selectedItems = model<T[]>([]);

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));
  }

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = this.modal();
    const result = await this.#sdModal.showAsync({
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
      this.selectedItems.set(result.selectedItems);
    }
  }

  onCancelButtonClick() {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }
}
