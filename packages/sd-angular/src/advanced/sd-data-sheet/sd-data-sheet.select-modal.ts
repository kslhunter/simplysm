import {
  ChangeDetectionStrategy,
  Component,
  inject,
  InputSignal, ModelSignal,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from "@angular/core";
import { Type } from "@simplysm/sd-core-common";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { SdModalBase } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $signal } from "../../utils/bindings/$signal";
import { useFullPageCodeSignal } from "../../utils/signals/use-full-page-code.signal";
import {
  ISharedDataModalInputParam,
  ISharedDataModalOutputResult,
} from "../shared-data/sd-shared-data-select.control";

@Component({
  selector: "sd-data-sheet-select-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl,
    SdPaneControl,
    SdDockContainerControl,
    SdDockControl,
    SdButtonControl,
  ],
  template: `
    @if (!perms().includes("use")) {
      <sd-pane class="tx-theme-grey-light p-xxl tx-center">
        <br />
        <sd-icon [icon]="icons.triangleExclamation" fixedWidth size="5x" />
        <br />
        <br />
        {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </sd-pane>
    } @else {
      <sd-dock-container>
        <sd-dock-container style="min-width: 40em">
          <ng-template #componentContainer />

          @if (params().selectMode) {
            <sd-dock
              position="bottom" class="p-sm-default bdt bdt-trans-light flex-row flex-gap-sm"
              style="justify-content: right"
            >
              <sd-button theme="danger" inline (click)="onCancelButtonClick()">
                {{ params().selectMode === "multi" ? "모두" : "선택" }}
                해제
              </sd-button>
              @if (params().selectMode === "multi") {
                <sd-button theme="primary" inline (click)="onConfirmButtonClick()">
                  확인({{ component()?.selectedItemKeys().length ?? 0 }})
                </sd-button>
              }
            </sd-dock>
          }
        </sd-dock-container>
      </sd-dock-container>
    }
  `,
})
export class SdDataSheetSelectModal<T extends ISdDataSheetControl>
  extends SdModalBase<ISdDataSheetControlParam<T>, ISharedDataModalOutputResult> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdAppStructure = inject(SdAppStructureProvider);

  componentViewContainerRef = viewChild("componentContainer", { read: ViewContainerRef });

  private _fullPageCode = useFullPageCodeSignal();
  perms = $computed(() => this._sdAppStructure.getViewPerms([this._fullPageCode()], ["use"]));

  component = $signal<T>();

  constructor() {
    super();

    $effect([this.componentViewContainerRef], () => {
      if (!this.componentViewContainerRef()) return;

      //-- create component
      const componentRef = this.componentViewContainerRef()!.createComponent(this.params().type);
      componentRef.setInput("viewType", "modal");
      componentRef.setInput("selectMode", this.params().selectMode);
      componentRef.setInput("selectedItemKeys", this.params().selectedItemKeys ?? []);
      if (this.params().inputs) {
        for (const key in this.params().inputs) {
          componentRef.setInput(key, this.params().inputs![key]);
        }
      }

      this.component.set(componentRef.instance);
    });

    //-- init > open
    $effect(() => {
      if (!this.component()) return;
      if (!this.component()!.initialized()) return;

      this.open();
    });

    //-- single select > close
    $effect(() => {
      if (!this.component()) return;
      if (!this.component()!.initialized()) return;

      if (
        this.params().selectMode === "single"
        && this.component()!.selectedItemKeys()[0] !== this.params().selectedItemKeys?.[0]
      ) {
        this.close({ selectedItemKeys: this.component()!.selectedItemKeys() });
      }
    });
  }

  onConfirmButtonClick() {
    this.close({ selectedItemKeys: this.component()!.selectedItemKeys() });
  }

  onCancelButtonClick() {
    this.close({ selectedItemKeys: [] });
  }
}

export interface ISdDataSheetControl {
  viewType: InputSignal<"modal" | "control" | "page">;
  initialized: ModelSignal<boolean>;
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: ModelSignal<any>;
}

export interface ISdDataSheetControlParam<T> extends ISharedDataModalInputParam {
  type: Type<T>;
  inputs?: Partial<Omit<{
    [P in keyof T as T[P] extends InputSignal<any> ? P : never]:
    T[P] extends InputSignal<any> ? ReturnType<T[P]> : never
  }, "selectMode" | "selectedItemKeys" | "initialized">>;
}