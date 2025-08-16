import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef, ViewEncapsulation } from "@angular/core";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../../directives/sd-item-of.template-directive";
import { ISharedDataBase } from "./sd-shared-data.provider";
import {
  AbsSdDataSelectButton,
  ISdSelectModal,
  SdDataSelectButtonControl,
  TSdSelectModalInfo,
} from "../sd-data-view/sd-data-select-button.control";
import { TSelectModeValue } from "../../controls/select/sd-select.control";

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
          [ngTemplateOutlet]="itemTemplateRef()"
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

  itemTemplateRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });

  override load(keys: number[]) {
    return this.items().filter((item) => keys.includes(item.__valueKey));
  }
}

