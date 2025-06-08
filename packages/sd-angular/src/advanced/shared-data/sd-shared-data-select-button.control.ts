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
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/sd-item-of.template-directive";
import { ISharedDataBase } from "./sd-shared-data.provider";
import {
  AbsSdDataSelectButton, ISdSelectModal,
  SdDataSelectButtonControl,
  TSdSelectModalInfo,
} from "../sd-data-sheet/sd-data-select-button.control";
import { TSelectModeValue } from "../../controls/sd-select-control";

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
    </sd-data-select-button>
  `,
})
export class SdSharedDataSelectButtonControl<
  T extends ISharedDataBase<number>,
  M extends keyof TSelectModeValue<number>,
  TModal extends ISdSelectModal
> extends AbsSdDataSelectButton<T, number, M> {
  items = input<T[]>([]);
  modal = input.required<TSdSelectModalInfo<TModal>>();

  itemTemplateRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );

  override load(keys: number[]) {
    return this.items().filter((item) => keys.includes(item.__valueKey));
  }
}
