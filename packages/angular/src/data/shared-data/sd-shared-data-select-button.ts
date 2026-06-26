import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  model,
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
  TMode extends keyof SelectModeValue<TItem>,
  TModal extends SdSelectModal<any>,
> {
  value = model<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();
  items = input<TItem[]>([]);
  modal = input.required<SdSelectModalInfo<TModal>>();
  selectMode = input<TMode>("single" as TMode);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();

  itemTplRef = contentChild.required<SdItemOfTemplate<TItem>, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );

  _selectedItems = computed<TItem[]>(() => {
    const v = this.value();
    const items = this.items();
    const mode = this.selectMode();

    if (mode === "multi" && Array.isArray(v) && v.filterExists().length > 0) {
      const keys = v.filterExists() as (string | number)[];
      return items.filter((it) => keys.includes(it.__valueKey));
    } else if (mode === "single" && !Array.isArray(v) && v != null) {
      return items.filter((it) => it.__valueKey === v);
    } else {
      return [];
    }
  });
}
