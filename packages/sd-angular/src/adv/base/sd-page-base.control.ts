import {
  ChangeDetectionStrategy,
  Component, contentChildren,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdPaneControl } from "../../controls/layout/sd-pane.control";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { SdTopbarContainerControl } from "../../controls/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../../controls/topbar/sd-topbar.control";
import { injectPageCode$ } from "../../utils/injectPageCode$";
import { $computed, $effect } from "../../utils/$hooks";
import { transformBoolean } from "../../utils/tramsforms";
import { SdIconControl } from "../../controls/icon/sd-icon.control";
import { SdBackgroundProvider } from "../../providers/sd-background.provider";
import { SdBusyContainerControl } from "../../controls/busy/sd-busy-container.control";
import { NgTemplateOutlet } from "@angular/common";
import { TemplateTargetDirective } from "../../directives/template-target.directive";

@Component({
  selector: "sd-page-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    SdIconControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
  ],
  template: `
    <sd-busy-container [busy]="busy()">
      @if (!perms().includes("use")) {
        @if (initialized()) {
          <sd-pane class="tx-theme-grey-light p-xxl tx-center show-effect">
            <br />
            <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
            <br />
            <br />
            {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </sd-pane>
        }
      } @else {
        <sd-topbar-container>
          <sd-topbar>
            <h4>{{ title() }}</h4>

            @if (initialized()) {
              <ng-template [ngTemplateOutlet]="getTemplateRef('topbar')" />
            }
          </sd-topbar>

          @if (initialized()) {
            <sd-pane class="show-effect">
              <ng-template [ngTemplateOutlet]="getTemplateRef('content')" />
            </sd-pane>
          }
        </sd-topbar-container>
      }
    </sd-busy-container>
  `,
})
export class SdPageBaseControl {
  #sdAppStructure = inject(SdAppStructureProvider);
  #sdBackground = inject(SdBackgroundProvider);

  pageCode = injectPageCode$();
  title = $computed(() => this.#sdAppStructure.getTitleByCode(this.pageCode()));
  perms = $computed(() => this.#sdAppStructure.getViewPerms2([this.pageCode()], ["use"]));

  busy = input(false, { transform: transformBoolean });
  initialized = input(true, { transform: transformBoolean });
  bgGrey = input(false, { transform: transformBoolean });

  templateDirectives = contentChildren(TemplateTargetDirective);
  getTemplateRef = (target: "topbar" | "content") => {
    return this.templateDirectives().single(item => item.target() === target)?.templateRef ?? null;
  };

  constructor() {
    $effect([this.bgGrey], () => {
      this.#sdBackground.theme.set(this.bgGrey() ? "grey" : undefined);
    });
  }

  protected readonly faTriangleExclamation = faTriangleExclamation;
}