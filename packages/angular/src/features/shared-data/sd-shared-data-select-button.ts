import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import type { SharedDataBase } from "../../core/providers/sd-shared-data.provider";
import {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "../../core/directives/sd-item-of-template";
import { SdDataSelectButton } from "../data-view/sd-data-select-button";
import { SdDataSelectButtonBase } from "../data-view/sd-data-select-button.base";
import type {
  SdSelectModal,
  SdSelectModalInfo,
} from "../../ui/form/button/sd-modal-select-button";
import type { SelectModeValue } from "../../ui/form/select/sd-select";

@Component({
  selector: "sd-shared-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSelectButton, NgTemplateOutlet, SdItemOfTemplate],
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
export class SdSharedDataSelectButton<
  TItem extends SharedDataBase<string | number>,
  TMode extends keyof SelectModeValue<string | number>,
  TModal extends SdSelectModal<any>,
> extends SdDataSelectButtonBase<TItem, string | number, TMode> {
  items = input<TItem[]>([]);
  modal = input.required<SdSelectModalInfo<TModal>>();

  itemTplRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<TItem>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );

  override load(keys: (string | number)[]): TItem[] {
    return this.items().filter((item) => keys.includes(item.__valueKey));
  }
}
