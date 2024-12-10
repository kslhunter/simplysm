import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
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
  ],
  template: `
    @if (!perms().includes("use")) {
      <sd-pane class="tx-theme-grey-light p-xxl tx-center show-effect">
        <br />
        <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
        <br />
        <br />
        {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </sd-pane>
    } @else {
      <sd-topbar-container>
        <sd-topbar>
          <h4>{{ title() }}</h4>

          <ng-content select="sd-topbar-menu" />
        </sd-topbar>

        <ng-content />
      </sd-topbar-container>
    }
  `,
})
export class SdPageBaseControl {
  #sdAppStructure = inject(SdAppStructureProvider);
  #sdBackground = inject(SdBackgroundProvider);

  pageCode = injectPageCode$();
  title = $computed(() => this.#sdAppStructure.getTitleByCode(this.pageCode()));
  perms = $computed(() => this.#sdAppStructure.getViewPerms2([this.pageCode()], ["use"]));

  bgGrey = input(false, { transform: transformBoolean });

  constructor() {
    $effect([this.bgGrey], () => {
      this.#sdBackground.theme.set(this.bgGrey() ? "grey" : undefined);
    });
  }

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
