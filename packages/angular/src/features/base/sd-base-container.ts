import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainer } from "../../ui/overlay/busy/sd-busy-container";
import { SdTopbarContainer } from "../../ui/navigation/topbar/sd-topbar-container";
import { SdTopbar } from "../../ui/navigation/topbar/sd-topbar";
import { SdAppStructureProvider } from "../../core/providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../../core/providers/sd-activated-modal.provider";
import { injectCurrentPageCodeSignal } from "../../core/utils/injectCurrentPageCodeSignal";
import { injectFullPageCodeSignal } from "../../core/utils/injectFullPageCodeSignal";
import {
  injectViewTypeSignal,
  type SdViewType,
} from "../../core/utils/injectViewTypeSignal";
import { injectParent } from "../../core/utils/injectParent";
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer,
    SdTopbarContainer,
    SdTopbar,
    NgTemplateOutlet,
    NgIcon,
  ],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (initialized() === undefined || initialized()) {
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
export class SdBaseContainer {
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdAppStructure = inject(SdAppStructureProvider);

  private readonly _parent = injectParent();

  private readonly _fullPageCode = injectFullPageCodeSignal();
  private readonly _currPageCode = injectCurrentPageCodeSignal();

  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });

  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

  private readonly _parentViewType = injectViewTypeSignal(() => this._parent);
  viewType = input<SdViewType>();
  currViewType = computed(() => this.viewType() ?? this._parentViewType());

  header = input<string>();
  modalOrPageTitle = computed(() => {
    try {
      return (
        this.header() ??
        this._sdActivatedModal?.modalComponent()?.title() ??
        this._sdAppStructure.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode())
      );
    } catch {
      return "";
    }
  });

  initialized = input<boolean | undefined>(undefined);
  restricted = input(false, { transform: booleanAttribute });
  busy = input(false, { transform: booleanAttribute });
  busyMessage = input<string>();

  protected readonly tablerAlertTriangle = tablerAlertTriangle;
}
