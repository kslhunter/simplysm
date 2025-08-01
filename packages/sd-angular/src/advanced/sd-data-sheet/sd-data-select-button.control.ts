import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  input,
  InputSignal,
  model,
  Signal,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAdditionalButtonControl } from "../../controls/sd-additional-button.control";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { TSelectModeValue } from "../../controls/select/sd-select.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { ISdModal, ISdModalInfo, SdModalProvider } from "../../providers/sd-modal.provider";
import { transformBoolean } from "../../utils/type-tramsforms";
import { $computed } from "../../utils/bindings/$computed";
import { setupInvalid } from "../../utils/setups/setup-invalid";
import { $effect } from "../../utils/bindings/$effect";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../../directives/sd-item-of.template-directive";
import { NgTemplateOutlet } from "@angular/common";
import { $signal } from "../../utils/bindings/$signal";
import { injectParent } from "../../utils/injections/inject-parent";

@Component({
  selector: "sd-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAdditionalButtonControl, FaIconComponent, SdButtonControl, SdAnchorControl, NgTemplateOutlet],
  template: `
    <sd-additional-button [inset]="parent.inset()" [size]="parent.size()">
      @for (item of parent.selectedItems(); track item; let index = $index) {
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
      <ng-content />

      @if (!parent.disabled() && !parent.isNoValue() && !parent.required()) {
        <sd-anchor (click)="onCancelButtonClick()" theme="danger">
          <fa-icon [icon]="icons.eraser" />
        </sd-anchor>
      }

      @if (!parent.disabled()) {
        <sd-button (click)="onModalButtonClick($event)" inset>
          <fa-icon [icon]="icons.search" />
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

        /*> sd-additional-button {
          background: var(--theme-secondary-lightest);
        }

        &[data-sd-disabled="true"] {
          > sd-additional-button {
            background: transparent;
          }
        }*/
      }
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "parent.disabled()",
  },
})
export class SdDataSelectButtonControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  parent = injectParent();

  itemTemplateRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<any>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });

  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    await this.parent.doShowModal();
  }

  async onCancelButtonClick() {
    await this.parent.doInitialValue();
  }
}

@Directive()
export abstract class AbsSdDataSelectButton<
  T extends object,
  K,
  M extends keyof TSelectModeValue<K> = keyof TSelectModeValue<K>,
> {
  //-- abstract
  abstract modal: Signal<TSdSelectModalInfo<ISdSelectModal>>; // computed
  abstract load(keys: K[]): Promise<T[]> | T[];

  //-- implement
  #sdModal = inject(SdModalProvider);

  value = model<TSelectModeValue<K>[M]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);
  isNoValue = $computed(() => {
    return this.value() == null || (this.selectMode() === "multi" && (this.value() as any[]).length === 0);
  });

  selectedItems = $signal<T[]>([]);

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));

    $effect([this.value], async () => {
      const value = this.value();
      if (this.selectMode() === "multi" && value instanceof Array && value.filterExists().length > 0) {
        this.selectedItems.set(await this.load(value.filterExists()));
      } else if (this.selectMode() === "single" && !(value instanceof Array) && value != null) {
        this.selectedItems.set(await this.load([value as K]));
      } else {
        this.selectedItems.set([]);
      }
    });
  }

  async doShowModal() {
    const modal = this.modal();
    const result = await this.#sdModal.showAsync({
      ...modal,
      inputs: {
        selectMode: this.selectMode(),
        selectedItemKeys: (this.selectMode() === "multi" ? (this.value() as any[]) : [this.value()]).filterExists(),
        ...modal.inputs,
      },
    });

    if (result) {
      const newValue = this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  doInitialValue() {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }
}

export interface ISdSelectModal extends ISdModal<ISelectModalOutputResult> {
  selectMode: InputSignal<"single" | "multi" | "none" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}

export type TSdSelectModalInfo<T extends ISdSelectModal> = ISdModalInfo<T, "selectMode" | "selectedItemKeys">;

export interface ISelectModalOutputResult {
  selectedItemKeys: any[];
}
