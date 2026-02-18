import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import {
  type SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../core/directives/sd-item-of-template.directive";
import type { ISharedDataBase } from "../../core/providers/storage/sd-shared-data.provider";
import {
  AbsSdDataSelectButton,
  type ISdSelectModal,
  SdDataSelectButtonControl,
  type TSdSelectModalInfo,
} from "../data-view/sd-data-select-button.control";
import type { TSelectModeValue } from "../../ui/form/select/sd-select.control";

@Component({
  selector: "sd-shared-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSelectButtonControl, NgTemplateOutlet, SdItemOfTemplateDirective],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="items()" let-item let-index="index">
        <ng-template
          [ngTemplateOutlet]="itemTplRef()"
          [ngTemplateOutletContext]="{
            $implicit: item,
            item: item,
            index: index,
            depth: 0,
          }"
        />
      </ng-template>
      <ng-content />
    </sd-data-select-button>
  `,
})
export class SdSharedDataSelectButtonControl<
  TItem extends ISharedDataBase<number>,
  TMode extends keyof TSelectModeValue<number>,
  TModal extends ISdSelectModal<any>,
> extends AbsSdDataSelectButton<TItem, number, TMode> {
  items = input<TItem[]>([]);
  modal = input.required<TSdSelectModalInfo<TModal>>();

  itemTplRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );

  override load(keys: number[]) {
    return this.items().filter((item) => keys.includes(item.__valueKey));
  }
}
