import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  effect,
  input,
  model,
  signal,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import type { SharedDataBase } from "../../core/shared-data/sd-shared-data.provider";
import {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "../../core/template/sd-item-of-template";
import {
  SdModalSelectButton,
  type SdSelectModal,
  type SdSelectModalInfo,
} from "../../controls/button/sd-modal-select-button";
import type { SelectModeValue } from "../../controls/select/sd-select";

@Component({
  selector: "sd-shared-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdModalSelectButton, NgTemplateOutlet],
  template: `
    <sd-modal-select-button
      [(value)]="value"
      [modal]="modal()"
      [disabled]="disabled()"
      [required]="required()"
      [inset]="inset()"
      [size]="size()"
      [selectMode]="selectMode()"
    >
      @for (item of _selectedItems(); track item; let index = $index) {
        @if (index !== 0) {
          <span>,&nbsp;</span>
        }
        <ng-template
          [ngTemplateOutlet]="itemTplRef()"
          [ngTemplateOutletContext]="{
            $implicit: item,
            item: item,
            index: index,
            depth: 0,
          }"
        />
      }
    </sd-modal-select-button>
  `,
})
export class SdSharedDataSelectButton<
  TItem extends SharedDataBase<string | number>,
  TMode extends keyof SelectModeValue<string | number>,
  TModal extends SdSelectModal<any>,
> {
  value = model<SelectModeValue<string | number>[TMode]>();
  items = input<TItem[]>([]);
  modal = input.required<SdSelectModalInfo<TModal>>();
  selectMode = input<TMode>("single" as TMode);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();

  itemTplRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );

  protected readonly _selectedItems = signal<TItem[]>([]);

  constructor() {
    effect(() => {
      const v = this.value();
      const items = this.items();
      const mode = this.selectMode();

      if (mode === "multi" && Array.isArray(v) && v.filterExists().length > 0) {
        const keys = v.filterExists() as (string | number)[];
        this._selectedItems.set(items.filter((it) => keys.includes(it.__valueKey)));
      } else if (mode === "single" && !Array.isArray(v) && v != null) {
        this._selectedItems.set(items.filter((it) => it.__valueKey === v));
      } else {
        this._selectedItems.set([]);
      }
    });
  }
}
