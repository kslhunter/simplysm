import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdPaneControl } from "../controls/sd-pane.control";
import { SdIconControl } from "../controls/sd-icon.control";
import { SdTopbarContainerControl } from "../controls/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/sd-topbar.control";
import { SdBusyContainerControl } from "../controls/sd-busy-container.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockContainerControl } from "../controls/sd-dock-container.control";
import { SdDockControl } from "../controls/sd-dock.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../providers/sd-modal.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { TemplateTargetDirective } from "../directives/template-target.directive";
import { $computed } from "../utils/hooks";
import { transformBoolean } from "../utils/type-tramsforms";
import { injectParent } from "../utils/route/parent.injector";
import { injectPageCode$ } from "../utils/route/page-code.signal-injector";
import { injectActivatedPageCode$ } from "../utils/route/activate-page-code.signal-injector";

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
  ],
  template: `
    <sd-busy-container [busy]="busy()">
      @if (!perms().includes("use")) {
        <sd-pane
          class="tx-theme-grey-light p-xxl tx-center"
          [class.show-effect]="realContainerType() !== 'modal'"
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
  icons = inject(SdAngularConfigProvider).icons;

  #activatedRoute = inject(ActivatedRoute, { optional: true });
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdAppStructure = inject(SdAppStructureProvider);

  #parent = injectParent();

  #pageCode = injectPageCode$();
  #activatedPageCode = injectActivatedPageCode$();

  templateDirectives = contentChildren(TemplateTargetDirective);
  getTemplateRef = (target: "topbar" | "content" | "bottom") => {
    return this.templateDirectives().single(item => item.target() === target)?.templateRef ?? null;
  };

  perms = $computed(() => this.#sdAppStructure.getViewPerms2(
    [this.#pageCode()],
    ["use"],
  ));

  realContainerType = $computed<"container" | "page" | "modal" | "control">(() => {
    if (this.containerType()) return this.containerType()!;
    else if (this.#activatedRoute && this.#activatedRoute.component === this.#parent.constructor) {
      if (this.#pageCode() === this.#activatedPageCode()) {
        return "page";
      }
      else {
        return "container";
      }
    }
    else if (this.#sdActivatedModal) {
      return "modal";
    }
    else {
      return "control";
    }
  });
  containerType = input<"container" | "page" | "modal" | "control">();

  title = $computed(() =>
    this.#sdActivatedModal
      ? this.#sdActivatedModal.modal.title()
      : this.#sdAppStructure.getTitleByCode(this.#activatedPageCode() ?? this.#pageCode()),
  );

  busy = input(false, { transform: transformBoolean });
}
