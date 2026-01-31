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
import { SdBusyContainerControl } from "../../ui/overlay/busy/sd-busy-container.control";
import { SdTopbarContainerControl } from "../../ui/navigation/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../../ui/navigation/topbar/sd-topbar.control";
import { SdAppStructureProvider } from "../../core/providers/app/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../../ui/overlay/modal/sd-modal.provider";
import { $computed } from "../../core/utils/bindings/$computed";
import { useCurrentPageCodeSignal } from "../../core/utils/signals/useCurrentPageCodeSignal";
import { useFullPageCodeSignal } from "../../core/utils/signals/useFullPageCodeSignal";
import { type TSdViewType, useViewTypeSignal } from "../../core/utils/signals/useViewTypeSignal";
import { transformBoolean } from "../../core/utils/transforms/transformBoolean";
import { injectParent } from "../../core/utils/injections/injectParent";
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTopbarContainerControl,
    SdTopbarControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
    NgIcon,
  ],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (initialized() == null || initialized()) {
        @if (restricted()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
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
              <div class="bdt bdt-theme-gray-lightest">
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
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdAppStructure = inject(SdAppStructureProvider);

  private readonly _parent = injectParent();

  private readonly _fullPageCode = useFullPageCodeSignal();
  private readonly _currPageCode = useCurrentPageCodeSignal();

  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });

  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

  private readonly _parentViewType = useViewTypeSignal(() => this._parent);
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this._parentViewType());

  header = input<string>();
  modalOrPageTitle = $computed(
    () =>
      this.header() ??
      this._sdActivatedModal?.modalComponent()?.title() ??
      this._sdAppStructure.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode()),
  );

  initialized = input(undefined, { transform: transformBoolean });
  restricted = input(false, { transform: transformBoolean });
  busy = input(false, { transform: transformBoolean });
  busyMessage = input<string>();

  protected readonly tablerAlertTriangle = tablerAlertTriangle;
}
