import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  signal,
  type Signal,
} from "@angular/core";
import type { SelectModeValue } from "../../ui/form/select/sd-select";
import {
  SdModalProvider,
  type SdModalOptions,
} from "../../ui/overlay/modal/sd-modal.provider";
import type {
  SdSelectModal,
  SdSelectModalInfo,
} from "../../ui/form/button/sd-modal-select-button";
import { setupInvalid } from "../../core/utils/setups/setupInvalid";

@Directive()
export abstract class SdDataSelectButtonBase<
  TItem extends object,
  TKey,
  TMode extends keyof SelectModeValue<TKey> = keyof SelectModeValue<TKey>,
> {
  //-- abstract
  abstract modal: Signal<SdSelectModalInfo<SdSelectModal<any>>>;
  abstract load(keys: TKey[]): Promise<TItem[]> | TItem[];

  //-- implement

  private readonly _sdModal = inject(SdModalProvider);

  value = model<SelectModeValue<TKey>[TMode]>();

  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<TMode>("single" as TMode);

  isNoValue = computed(() => {
    const v = this.value();
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  });

  selectedItems = signal<TItem[]>([]);

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));

    effect(() => {
      const value = this.value();
      const selectMode = this.selectMode();

      queueMicrotask(async () => {
        if (
          selectMode === "multi" &&
          Array.isArray(value) &&
          value.filterExists().length > 0
        ) {
          this.selectedItems.set(await this.load(value.filterExists() as TKey[]));
        } else if (selectMode === "single" && !Array.isArray(value) && value != null) {
          this.selectedItems.set(await this.load([value as TKey]));
        } else {
          this.selectedItems.set([]);
        }
      });
    });
  }

  async doShowModal(options?: SdModalOptions): Promise<void> {
    const modal = this.modal();
    const result = await this._sdModal.showAsync(
      {
        ...modal,
        inputs: {
          selectMode: this.selectMode(),
          selectedItemKeys: (this.selectMode() === "multi"
            ? ((this.value() as any[] | undefined) ?? [])
            : [this.value()]
          ).filterExists(),
          ...modal.inputs,
        },
      },
      options,
    );

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  doInitialValue(): void {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }
}
