import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdAdditionalButtonControl } from "./sd-additional-button.control";
import type { TSelectModeValue } from "../select/sd-select.control";
import { SdModalProvider } from "../../overlay/modal/sd-modal.provider";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";
import { setupInvalid } from "../../../core/utils/setups/setupInvalid";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdButtonControl } from "./sd-button.control";
import type {
  ISdSelectModal,
  TSdSelectModalInfo,
} from "../../../features/data-view/sd-data-select-button.control";
import { NgIcon } from "@ng-icons/core";
import { tablerEraser, tablerSearch } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-modal-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAdditionalButtonControl, SdAnchorControl, SdButtonControl, NgIcon],
  template: `
    <sd-additional-button [inset]="inset()" [size]="size()">
      <ng-content />

      @if (!disabled() && !isNoValue() && !required()) {
        <sd-anchor [theme]="'danger'" (click)="onCancelButtonClick()">
          <ng-icon [svg]="tablerEraser" />
        </sd-anchor>
      }

      @if (!disabled()) {
        <sd-button (click)="onModalButtonClick($event)" [inset]="true">
          <ng-icon [svg]="searchIcon()" />
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
export class SdModalSelectButtonControl<
  T extends object,
  K,
  M extends keyof TSelectModeValue<K> = keyof TSelectModeValue<K>,
> {
  private readonly _sdModal = inject(SdModalProvider);

  modal = input.required<TSdSelectModalInfo<ISdSelectModal<T>>>();

  value = model<TSelectModeValue<K>[M]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);

  searchIcon = input(tablerSearch);

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
      this.selectedItems.set(result.selectedItems);
    }
  }

  onCancelButtonClick() {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }

  protected readonly tablerEraser = tablerEraser;
}
