import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/sd-busy-container.control";
import { SdDockContainerControl } from "../controls/sd-dock-container.control";
import { SdDockControl } from "../controls/sd-dock.control";
import { SdPaneControl } from "../controls/sd-pane.control";
import { SdTopbarContainerControl } from "../controls/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/sd-topbar.control";
import { SdShowEffectDirective } from "../directives/sd-show-effect.directive";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../providers/sd-modal.provider";
import { $computed } from "../utils/bindings/$computed";
import { useCurrentPageCodeSignal } from "../utils/signals/use-current-page-code.signal";
import { useFullPageCodeSignal } from "../utils/signals/use-full-page-code.signal";
import { TSdViewType, useViewTypeSignal } from "../utils/signals/use-view-type.signal";
import { transformBoolean } from "../utils/type-tramsforms";
import { taAlertTriangle } from "@simplysm/sd-tabler-icons/icons/ta-alert-triangle";
import { SdTablerIconControl } from "../controls/tabler-icon/sd-tabler-icon.control";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
    SdDockContainerControl,
    SdDockControl,
    SdShowEffectDirective,
    SdTablerIconControl,
  ],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (initialized()) {
        @if (!visible()) {
          <sd-pane class="tx-theme-grey-light p-xxl tx-center" sd-show-effect>
            <br />
            <sd-tabler-icon [icon]="taAlertTriangle" style="font-size: 4em" />
            <br />
            <br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </sd-pane>
        } @else if (currViewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>

              <ng-template [ngTemplateOutlet]="pageTopbarTemplateRef() ?? null" />
            </sd-topbar>

            <sd-dock-container>
              @if (toolTemplateRef()) {
                <sd-dock>
                  <ng-template [ngTemplateOutlet]="toolTemplateRef() ?? null" />
                </sd-dock>
              }

              <sd-pane sd-show-effect>
                <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
              </sd-pane>
            </sd-dock-container>
          </sd-topbar-container>
        } @else if (currViewType() === "modal" && modalBottomTemplateRef()) {
          <sd-dock-container>
            <sd-pane sd-show-effect>
              <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
            </sd-pane>

            @if (modalBottomTemplateRef()) {
              <sd-dock position="bottom">
                <ng-template [ngTemplateOutlet]="modalBottomTemplateRef() ?? null" />
              </sd-dock>
            }
          </sd-dock-container>
        } @else {
          <sd-dock-container>
            @if (toolTemplateRef()) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="toolTemplateRef() ?? null" />
              </sd-dock>
            }

            <sd-pane sd-show-effect>
              <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
            </sd-pane>
          </sd-dock-container>
        }
      }
    </sd-busy-container>
  `,
})
export class SdBaseContainerControl {
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdAppStructure = inject(SdAppStructureProvider);

  #fullPageCode = useFullPageCodeSignal();
  #currPageCode = useCurrentPageCodeSignal();

  pageTopbarTemplateRef = contentChild("pageTopbar", { read: TemplateRef });
  toolTemplateRef = contentChild("tool", { read: TemplateRef });
  contentTemplateRef = contentChild.required("content", { read: TemplateRef });
  modalBottomTemplateRef = contentChild("modalBottom", { read: TemplateRef });

  #viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  modalOrPageTitle = $computed(
    () =>
      this.#sdActivatedModal?.modalComponent()?.title() ??
      this.#sdAppStructure.getTitleByFullCode(this.#currPageCode?.() ?? this.#fullPageCode()),
  );

  initialized = input.required({ transform: transformBoolean });
  visible = input(true, { transform: transformBoolean });
  busy = input(false, { transform: transformBoolean });
  busyMessage = input<string>();
  protected readonly taAlertTriangle = taAlertTriangle;
}
