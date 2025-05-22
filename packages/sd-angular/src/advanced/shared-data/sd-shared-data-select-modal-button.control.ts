import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { TSelectValue } from "../../controls/sd-select-control";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/sd-item-of.template-directive";
import { $effect } from "../../utils/bindings/$effect";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdSelectModalButtonControl, TSdSelectModalInput } from "../sd-select-modal-button.control";
import { ISharedDataBase } from "./sd-shared-data.provider";

@Component({
  selector: "sd-shared-data-select-modal-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdSelectModalButtonControl, NgTemplateOutlet],
  template: `
    <sd-select-modal-button
      [required]="required()"
      [disabled]="disabled()"
      [inset]="inset()"
      [size]="size()"
      [(value)]="value"
      [selectMode]="selectMode()"
      [modal]="modal()"
    >
      @for (item of selectedItems(); track item.__valueKey; let index = $index) {
        @if (index !== 0) {
          <div style="display: inline-block">,&nbsp;</div>
        }
        <div style="display: inline-block">
          <ng-template
            [ngTemplateOutlet]="itemTemplateRef()"
            [ngTemplateOutletContext]="{
              $implicit: item,
              item: item,
              index: index,
              depth: 0,
            }"
          ></ng-template>
        </div>
      }
    </sd-select-modal-button>
  `,
})
export class SdSharedDataSelectModalButtonControl<
  T extends ISharedDataBase<number>,
  M extends keyof TSelectValue<any>,
> {
  required = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();

  selectMode = input("single" as M);

  value = model<TSelectValue<number>[M]>();

  items = input<T[]>([]);
  selectedItems = $signal<T[]>([]);

  modal = input.required<TSdSelectModalInput>();

  itemTemplateRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );

  constructor() {
    $effect([this.value, this.selectMode, this.items], () => {
      const value = this.value();
      if (this.selectMode() === "multi" && value instanceof Array && value.length > 0) {
        this.selectedItems.set(this.items().filter((item) => value.includes(item.__valueKey)));
      } else if (this.selectMode() === "single" && !(value instanceof Array) && value != null) {
        this.selectedItems.set(this.items().filter((item) => item.__valueKey === value));
      } else {
        this.selectedItems.set([]);
      }
    });
  }
}
