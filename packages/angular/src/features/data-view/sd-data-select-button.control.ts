import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  inject,
  input,
  model,
  signal,
  type Signal,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import type { TSelectModeValue } from "../../ui/form/select/sd-select.control";
import {
  SdModalProvider,
  type ISdModalOptions,
} from "../../ui/overlay/modal/sd-modal.provider";
import type {
  ISdSelectModal,
  TSdSelectModalInfo,
} from "../../ui/form/button/sd-modal-select-button.control";
import { setupInvalid } from "../../core/utils/setups/setupInvalid";
import {
  SdItemOfTemplateDirective,
  type SdItemOfTemplateContext,
} from "../../core/directives/sd-item-of-template.directive";
import { NgTemplateOutlet } from "@angular/common";
import { injectParent } from "../../core/utils/injectParent";
import { SdAdditionalButtonControl } from "../../ui/form/button/sd-additional-button.control";
import { SdAnchorControl } from "../../ui/form/button/sd-anchor.control";
import { SdButtonControl } from "../../ui/form/button/sd-button.control";
import { NgIcon } from "@ng-icons/core";
import { tablerEraser, tablerSearch } from "@ng-icons/tabler-icons";

//#region AbsSdDataSelectButton

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

  private readonly _sdModal = inject(SdModalProvider);

  value = model<TSelectModeValue<TKey>[TMode]>();

  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<TMode>("single" as TMode);

  isNoValue = computed(() => {
    const v = this.value();
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  });

  selectedItems = signal<TItem[]>([]);

  constructor() {
    setupInvalid(() => (this.required() && this.value() == null ? "값을 입력하세요." : ""));

    effect(() => {
      const value = this.value();
      const selectMode = this.selectMode();

      queueMicrotask(async () => {
        if (
          selectMode === "multi" &&
          Array.isArray(value) &&
          value.filterExists().length > 0
        ) {
          this.selectedItems.set(await this.load(value.filterExists() as TKey[]));
        } else if (selectMode === "single" && !Array.isArray(value) && value != null) {
          this.selectedItems.set(await this.load([value as TKey]));
        } else {
          this.selectedItems.set([]);
        }
      });
    });
  }

  async doShowModal(options?: ISdModalOptions): Promise<void> {
    const modal = this.modal();
    const result = await this._sdModal.showAsync(
      {
        ...modal,
        inputs: {
          selectMode: this.selectMode(),
          selectedItemKeys: (this.selectMode() === "multi"
            ? ((this.value() as any[] | undefined) ?? [])
            : [this.value()]
          ).filterExists(),
          ...modal.inputs,
        },
      },
      options,
    );

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  doInitialValue(): void {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }
}

//#endregion

//#region SdDataSelectButtonControl

@Component({
  selector: "sd-data-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAdditionalButtonControl,
    NgTemplateOutlet,
    SdAnchorControl,
    SdButtonControl,
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
export class SdDataSelectButtonControl {
  parent = injectParent<AbsSdDataSelectButton<any, any>>();

  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<any>>>(
    SdItemOfTemplateDirective,
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
