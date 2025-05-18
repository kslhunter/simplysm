import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdBusyContainerControl } from "../controls/sd-busy-container.control";
import { SdDockContainerControl } from "../controls/sd-dock-container.control";
import { SdDockControl } from "../controls/sd-dock.control";
import { SdIconControl } from "../controls/sd-icon.control";
import { SdPaneControl } from "../controls/sd-pane.control";
import { SdTopbarContainerControl } from "../controls/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/sd-topbar.control";
import { SdShowEffectDirective } from "../directives/sd-show-effect.directive";
import { TemplateTargetDirective } from "../directives/template-target.directive";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../providers/sd-modal.provider";
import { $computed } from "../utils/bindings/$computed";
import { injectParent } from "../utils/injections/inject-parent";
import { useCurrentPageCodeSignal } from "../utils/signals/use-current-page-code.signal";
import { useFullPageCodeSignal } from "../utils/signals/use-full-page-code.signal";
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
          [sd-show-effect]="realContainerType() !== 'modal'"
        >
          <br />
          <sd-icon [icon]="icons.triangleExclamation" fixedWidth size="5x" />
          <br />
          <br />
          {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
        </sd-pane>
      } @else if (realContainerType() === "page") {
        <sd-topbar-container>
          <sd-topbar>
            <h4>{{ title() }}</h4>

            <ng-template [ngTemplateOutlet]="getTemplateRef('topbar')" />
          </sd-topbar>

          <ng-template [ngTemplateOutlet]="getTemplateRef('content')" />
        </sd-topbar-container>
      } @else if (realContainerType() === 'modal') {
        <sd-dock-container>
          <ng-template [ngTemplateOutlet]="getTemplateRef('content')" />

          @if (getTemplateRef('bottom')) {
            <sd-dock position="bottom">
              <ng-template [ngTemplateOutlet]="getTemplateRef('bottom')" />
            </sd-dock>
          }
        </sd-dock-container>
      } @else {
        <ng-template [ngTemplateOutlet]="getTemplateRef('content')" />
      }
    </sd-busy-container>
  `,
})
export class SdBaseContainerControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _activatedRoute = inject(ActivatedRoute, { optional: true });
  private _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private _sdAppStructure = inject(SdAppStructureProvider);

  private _parent = injectParent();

  private _fullPageCode = useFullPageCodeSignal();
  private _currPageCode = useCurrentPageCodeSignal();

  templateDirectives = contentChildren(TemplateTargetDirective);
  getTemplateRef = (target: "topbar" | "content" | "bottom") => {
    return this.templateDirectives().single(item => item.target() === target)?.templateRef ?? null;
  };

  perms = $computed(() => this._sdAppStructure.getViewPerms(
    [this._fullPageCode()],
    ["use"],
  ));

  realContainerType = $computed<"container" | "page" | "modal" | "control">(() => {
    if (this.containerType()) return this.containerType()!;
    else if (this._activatedRoute && this._activatedRoute.component === this._parent.constructor) {
      if (this._fullPageCode() === this._currPageCode?.()) {
        return "page";
      }
      else {
        return "container";
      }
    }
    else if (this._sdActivatedModal) {
      return "modal";
    }
    else {
      return "control";
    }
  });
  containerType = input<"container" | "page" | "modal" | "control">();

  title = $computed(() =>
    this._sdActivatedModal
      ? this._sdActivatedModal.modal.title()
      : this._sdAppStructure.getTitleByCode(
        this._currPageCode?.() ?? this._fullPageCode(),
      ),
  );

  busy = input(false, { transform: transformBoolean });
  busyMessage = input<string>();
}
