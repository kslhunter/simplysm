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
import { SdAdditionalButtonControl } from "../../controls/SdAdditionalButtonControl";
import { TSelectModeValue } from "../../controls/select/SdSelectControl";
import { SdAngularConfigProvider } from "../../providers/SdAngularConfigProvider";
import { ISdModal, ISdModalInfo, SdModalProvider } from "../../providers/SdModalProvider";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";
import { $computed } from "../../utils/bindings/$computed";
import { setupInvalid } from "../../utils/setups/setupInvalid";
import { $effect } from "../../utils/bindings/$effect";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/SdItemOfTemplateDirective";
import { NgTemplateOutlet } from "@angular/common";
import { injectParent } from "../../utils/injections/injectParent";
import { SdAnchorControl } from "../../controls/SdAnchorControl";
import { SdButtonControl } from "../../controls/SdButtonControl";
import { $signal } from "../../utils/bindings/$signal";

@Component({
  selector: "sd-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAdditionalButtonControl,
    FaIconComponent,
    NgTemplateOutlet,
    SdAnchorControl,
    SdButtonControl,
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
        <sd-anchor theme="danger" (click)="onCancelButtonClick()">
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

  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<any>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );

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
  TItem extends object,
  TKey,
  TMode extends keyof TSelectModeValue<TKey> = keyof TSelectModeValue<TKey>,
> {
  //-- abstract
  abstract modal: Signal<TSdSelectModalInfo<ISdSelectModal<any>>>;
  abstract load(keys: TKey[]): Promise<TItem[]> | TItem[];

  //-- implement
  #sdModal = inject(SdModalProvider);

  value = model<TSelectModeValue<TKey>[TMode]>();

  disabled = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  selectMode = input<TMode>("single" as TMode);
  isNoValue = $computed(() => {
    return (
      this.value() == null ||
      (this.selectMode() === "multi" && (this.value() as any[]).length === 0)
    );
  });

  selectedItems = $signal<TItem[]>([]);

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));

    $effect([this.value], async () => {
      const value = this.value();
      if (
        this.selectMode() === "multi" &&
        value instanceof Array &&
        value.filterExists().length > 0
      ) {
        this.selectedItems.set(await this.load(value.filterExists()));
      } else if (this.selectMode() === "single" && !(value instanceof Array) && value != null) {
        this.selectedItems.set(await this.load([value as TKey]));
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
        selectedItemKeys: (this.selectMode() === "multi"
          ? (this.value() as any[])
          : [this.value()]
        ).filterExists(),
        ...modal.inputs,
      },
    });

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  doInitialValue() {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }
}

export interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}

export type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<
  T,
  "selectMode" | "selectedItemKeys"
>;

export interface ISelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
