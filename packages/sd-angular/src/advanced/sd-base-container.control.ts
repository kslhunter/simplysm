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
import { SdTopbarContainerControl } from "../controls/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/topbar/sd-topbar.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../providers/sd-modal.provider";
import { $computed } from "../utils/bindings/$computed";
import { useCurrentPageCodeSignal } from "../utils/signals/use-current-page-code.signal";
import { useFullPageCodeSignal } from "../utils/signals/use-full-page-code.signal";
import { TSdViewType, useViewTypeSignal } from "../utils/signals/use-view-type.signal";
import { transformBoolean } from "../utils/type-tramsforms";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { injectParent } from "../utils/injections/inject-parent";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent, SdTopbarContainerControl, SdTopbarControl, SdBusyContainerControl, NgTemplateOutlet],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (initialized() == null || initialized()) {
        @if (restricted()) {
          <div class="fill tx-theme-grey-light p-xxl tx-center">
            <br />
            <fa-icon [icon]="icons.triangleExclamation" [fixedWidth]="true" size="5x" />
            <br />
            <br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (currViewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>

              <ng-template [ngTemplateOutlet]="pageTopbarTemplateRef() ?? null" />
            </sd-topbar>

            <div class="fill">
              <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
            </div>
          </sd-topbar-container>
        } @else if (currViewType() === "modal") {
          <div class="flex-vertical fill">
            <div class="flex-fill">
              <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
            </div>
            @if (modalBottomTemplateRef()) {
              <div class="bdt bdt-theme-grey-lightest">
                <ng-template [ngTemplateOutlet]="modalBottomTemplateRef() ?? null" />
              </div>
            }
          </div>
        } @else {
          <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
        }
      }
    </sd-busy-container>
  `,
})
export class SdBaseContainerControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdAppStructure = inject(SdAppStructureProvider);

  #parent = injectParent();

  #fullPageCode = useFullPageCodeSignal();
  #currPageCode = useCurrentPageCodeSignal();

  contentTemplateRef = contentChild.required("content", { read: TemplateRef });

  pageTopbarTemplateRef = contentChild("pageTopbar", { read: TemplateRef });
  modalBottomTemplateRef = contentChild("modalBottom", { read: TemplateRef });

  #parentViewType = useViewTypeSignal(() => this.#parent);
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#parentViewType());

  header = input<string>();
  modalOrPageTitle = $computed(
    () =>
      this.header() ??
      this.#sdActivatedModal?.modalComponent()?.title() ??
      this.#sdAppStructure.getTitleByFullCode(this.#currPageCode?.() ?? this.#fullPageCode()),
  );

  initialized = input(undefined, { transform: transformBoolean });
  restricted = input(false, { transform: transformBoolean });
  busy = input(false, { transform: transformBoolean });
  busyMessage = input<string>();
}
