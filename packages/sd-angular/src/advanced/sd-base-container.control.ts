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
import { SdIconControl } from "../controls/sd-icon.control";
import { SdPaneControl } from "../controls/sd-pane.control";
import { SdTopbarContainerControl } from "../controls/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/sd-topbar.control";
import { SdShowEffectDirective } from "../directives/sd-show-effect.directive";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../providers/sd-modal.provider";
import { $computed } from "../utils/bindings/$computed";
import { useCurrentPageCodeSignal } from "../utils/signals/use-current-page-code.signal";
import { useFullPageCodeSignal } from "../utils/signals/use-full-page-code.signal";
import { TSdViewType, useViewTypeSignal } from "../utils/signals/use-view-type.signal";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdIconControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
    SdDockContainerControl,
    SdDockControl,
    SdShowEffectDirective,
  ],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (!perms().includes("use")) {
        <sd-pane
          class="tx-theme-grey-light p-xxl tx-center"
          [sd-show-effect]="currViewType() !== 'modal'"
        >
          <br />
          <sd-icon [icon]="icons.triangleExclamation" fixedWidth size="5x" />
          <br />
          <br />
          '{{ title() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
        </sd-pane>
      } @else if (currViewType() === "page") {
        <sd-topbar-container>
          <sd-topbar>
            <h4>{{ title() }}</h4>

            <ng-template [ngTemplateOutlet]="pageTopbarTemplateRef() ?? null" />
          </sd-topbar>

          <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
        </sd-topbar-container>
      } @else if (currViewType() === "modal" && modalBottomTemplateRef()) {
        <sd-dock-container>
          <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />

          <sd-dock position="bottom">
            <ng-template [ngTemplateOutlet]="modalBottomTemplateRef() ?? null" />
          </sd-dock>
        </sd-dock-container>
      } @else {
        <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
      }
    </sd-busy-container>
  `,
})
export class SdBaseContainerControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private _sdAppStructure = inject(SdAppStructureProvider);

  private _fullPageCode = useFullPageCodeSignal();
  private _currPageCode = useCurrentPageCodeSignal();

  pageTopbarTemplateRef = contentChild("pageTopbar", { read: TemplateRef });
  contentTemplateRef = contentChild("content", { read: TemplateRef });
  modalBottomTemplateRef = contentChild("modalBottom", { read: TemplateRef });

  perms = $computed(() => this._sdAppStructure.getViewPerms([this._fullPageCode()], ["use"]));

  private _viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this._viewType());

  title = $computed(
    () =>
      this._sdActivatedModal?.modalComponent()?.title() ??
      this._sdAppStructure.getTitleByCode(this._currPageCode?.() ?? this._fullPageCode()),
  );

  busy = input(false, { transform: transformBoolean });
  busyMessage = input<string>();
}
