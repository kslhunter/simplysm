import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  inject,
  input,
  InputSignalWithTransform,
  Type,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdModalBaseControl } from "../../base/sd-modal-base.control";
import { $computed, $effect, $set, $signal } from "../../../utils/$hooks";
import { SdActivatedModalProvider } from "../../../controls/modal/sd-modal.provider";
import { SdSheetViewBase } from "../sheet-base/sd-sheet-view-base";
import { ISharedDataModalInputParam } from "../../shared-data/sd-shared-data-select.control";
import { ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-select-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockContainerControl,
    SdPaneControl,
    SdDockControl,
    SdButtonControl,
    SdModalBaseControl,
  ],
  template: `
    <sd-modal-base [viewCodes]="viewCodes()">
      <sd-dock-container style="min-width: 40em">
        <sd-pane class="p-lg">
          <ng-container #sheetViewContainer></ng-container>
        </sd-pane>

        @if (params().selectMode === "multi") {
          <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light tx-right">
            <sd-button theme="primary" inline (click)="onConfirmButtonClick()">
              확인({{ this.allSelectedItemKeySet().size }})
            </sd-button>
          </sd-dock>
        }
      </sd-dock-container>
    </sd-modal-base>
  `,
})
export class SdSelectModalBaseControl<SV extends SdSheetViewBase<any>> {
  #sdActivatedModal = inject(SdActivatedModalProvider);

  params = $computed(() => this.#sdActivatedModal.content.params() as ISharedDataModalInputParam);

  sheetViewVcr = viewChild.required("sheetViewContainer", { read: ViewContainerRef });

  sheetViewControlRef = $signal<ComponentRef<SV>>();

  sheetViewConfig = input.required<{
    type: Type<SV>,
    params: {
      [K in keyof SV as SV[K] extends InputSignalWithTransform<any, any>
        ? K
        : never]?: SV[K] extends InputSignalWithTransform<infer T, any> ? T : never
    };
  }>();

  allSelectedItemKeySet = $signal(new Set<number>());

  initialized = $computed(() => Boolean(this.sheetViewControlRef()?.instance.baseControl().initialized()));
  viewCodes = $computed(() => this.sheetViewControlRef()?.instance.viewModel.viewCodes ?? []);

  items = $computed(() => this.sheetViewControlRef()?.instance.items() ?? []);
  selectedItems = $computed(() => this.sheetViewControlRef()?.instance.selectedItems() ?? []);

  constructor() {
    $effect([], () => {
      this.sheetViewControlRef.set(this.sheetViewVcr().createComponent(this.sheetViewConfig().type));
      this.sheetViewControlRef()!.setInput("selectMode", this.params().selectMode);
      for (const key of Object.keys(this.sheetViewConfig().params)) {
        this.sheetViewControlRef()!.setInput(key, this.sheetViewConfig().params[key]);
      }

      this.allSelectedItemKeySet.set(new Set(this.params().selectedItemKeys));
    });

    $effect([this.items, this.allSelectedItemKeySet], () => {
      this.sheetViewControlRef()?.setInput(
        "selectedItems",
        this.items().filter((item) => this.allSelectedItemKeySet().has(item.id)),
      );
    });

    $effect([this.selectedItems], () => {
      if (ObjectUtil.equal(
        this.selectedItems(),
        this.items().filter((item) => this.allSelectedItemKeySet().has(item.id)),
        { onlyOneDepth: true },
      )) {
        return;
      }

      if (this.params().selectMode === "single") {
        this.#sdActivatedModal.content.close({
          selectedItemKeys: this.selectedItems().map((item) => item.id),
        });
      }
      else {
        for (const item of this.items()) {
          $set(this.allSelectedItemKeySet).toggle(item.id, this.selectedItems().includes(item) ? "add" : "del");
        }
      }
    });

    $effect(() => {
      if (this.initialized()) {
        this.#sdActivatedModal.content.open();
      }
    });
  }

  onConfirmButtonClick() {
    this.#sdActivatedModal.content.close({
      selectedItemKeys: Array.from(this.allSelectedItemKeySet()),
    });
  }
}