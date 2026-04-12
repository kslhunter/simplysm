import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "../../core/template/sd-item-of-template";
import { NgTemplateOutlet } from "@angular/common";
import { injectParent } from "../../core/injectParent";
import { SdAdditionalButton } from "../../controls/button/sd-additional-button";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdButton } from "../../controls/button/sd-button";
import { NgIcon } from "@ng-icons/core";
import { tablerEraser, tablerSearch } from "@ng-icons/tabler-icons";
import { SdDataSelectButtonBase } from "./sd-data-select-button.base";

//#region SdDataSelectButton

@Component({
  selector: "sd-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAdditionalButton,
    NgTemplateOutlet,
    SdAnchor,
    SdButton,
    NgIcon,
  ],
  template: `
    <sd-additional-button [inset]="parent.inset()" [size]="parent.size()">
      @if (itemTplRef()) {
        @for (item of parent.selectedItems(); track item; let index = $index) {
          @if (index !== 0) {
            <div style="display: inline-block">,&nbsp;</div>
          }
          <div style="display: inline-block">
            <ng-template
              [ngTemplateOutlet]="itemTplRef()!"
              [ngTemplateOutletContext]="{
                $implicit: item,
                item: item,
                index: index,
                depth: 0,
              }"
            ></ng-template>
          </div>
        }
      }
      <ng-content />

      @if (!parent.disabled() && !parent.isNoValue() && !parent.required()) {
        <sd-anchor [theme]="'danger'" (click)="onEraseClick()">
          <ng-icon [svg]="tablerEraser" />
        </sd-anchor>
      }

      @if (!parent.disabled()) {
        <sd-button (click)="onSearchClick($event)" [inset]="true">
          <ng-icon [svg]="tablerSearch" />
        </sd-button>
      }
    </sd-additional-button>
  `,
  styles: [
    /* language=SCSS */ `
      sd-data-select-button {
        display: block;
        width: 100%;
        min-width: 3em;
      }
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "parent.disabled()",
  },
})
export class SdDataSelectButton {
  parent = injectParent<SdDataSelectButtonBase<any, any>>();

  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<any>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );

  async onSearchClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.parent.doShowModal();
  }

  onEraseClick(): void {
    this.parent.doInitialValue();
  }

  protected readonly tablerEraser = tablerEraser;
  protected readonly tablerSearch = tablerSearch;
}

//#endregion
