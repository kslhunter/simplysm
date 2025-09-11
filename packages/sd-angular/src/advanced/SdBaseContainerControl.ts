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
import { SdBusyContainerControl } from "../controls/SdBusyContainerControl";
import { SdTopbarContainerControl } from "../controls/topbar/SdTopbarContainerControl";
import { SdTopbarControl } from "../controls/topbar/SdTopbarControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdAppStructureProvider } from "../providers/SdAppStructureProvider";
import { SdActivatedModalProvider } from "../providers/SdModalProvider";
import { $computed } from "../utils/bindings/$computed";
import { useCurrentPageCodeSignal } from "../utils/signals/useCurrentPageCodeSignal";
import { useFullPageCodeSignal } from "../utils/signals/useFullPageCodeSignal";
import { TSdViewType, useViewTypeSignal } from "../utils/signals/useViewTypeSignal";
import { transformBoolean } from "../utils/transforms/tramsformBoolean";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { injectParent } from "../utils/injections/injectParent";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    FaIconComponent,
    SdTopbarContainerControl,
    SdTopbarControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
  ],
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

              <ng-template [ngTemplateOutlet]="pageTopbarTplRef() ?? null" />
            </sd-topbar>

            <div class="fill">
              <ng-template [ngTemplateOutlet]="contentTplRef()" />
            </div>
          </sd-topbar-container>
        } @else if (currViewType() === "modal") {
          <div class="flex-column fill">
            <div class="flex-fill">
              <ng-template [ngTemplateOutlet]="contentTplRef()" />
            </div>
            @if (modalBottomTplRef()) {
              <div class="bdt bdt-theme-grey-lightest">
                <ng-template [ngTemplateOutlet]="modalBottomTplRef() ?? null" />
              </div>
            }
          </div>
        } @else {
          <ng-template [ngTemplateOutlet]="contentTplRef()" />
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

  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });

  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

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
