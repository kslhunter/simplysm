import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/busy/sd-busy-container.control";
import { SdPaneControl } from "../controls/layout/sd-pane.control";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { SdTopbarContainerControl } from "../controls/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../controls/topbar/sd-topbar.control";
import { NgTemplateOutlet } from "@angular/common";
import { injectPageCode$ } from "../utils/injectPageCode$";
import { $computed, $effect } from "../utils/$hooks";
import { ActivatedRoute } from "@angular/router";
import { injectParent } from "../utils/injectParent";
import { SdActivatedModalProvider } from "../controls/modal/sd-modal.provider";
import { transformBoolean } from "../utils/tramsforms";
import { SdIconControl } from "../controls/icon/sd-icon.control";
import { SdBackgroundProvider } from "../providers/sd-background.provider";

/** @deprecated sd-page-base, sd-modal-base 컴포넌트로 대체되었습니다. */
@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdPaneControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    NgTemplateOutlet,
    SdIconControl,
  ],
  template: `
    @if (denied()) {
      <sd-pane
        class="tx-theme-grey-light p-xxl tx-center"
        [class.show-effect]="!noEffect() && containerType !== 'modal'"
      >
        <br />
        <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
        <br />
        <br />
        {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </sd-pane>
    } @else if (containerType === "page" && isLastPage() && title() != "undefined") {
      <sd-topbar-container>
        <sd-topbar>
          <h4>{{ title() }}</h4>

          @if (initialized()) {
            <ng-template [ngTemplateOutlet]="topbarTemplateRef() ?? null" />
          }
        </sd-topbar>

        <sd-busy-container [busy]="busy()">
          @if (initialized()) {
            <sd-pane [class.show-effect]="!noEffect()">
              <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
            </sd-pane>
          }
        </sd-busy-container>
      </sd-topbar-container>
    } @else {
      <sd-busy-container [busy]="busy()">
        @if (initialized()) {
          <sd-pane [class.show-effect]="!noEffect() && containerType !== 'modal'">
            <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
          </sd-pane>
        }
      </sd-busy-container>
    }
  `,
})
export class SdBaseContainerControl {
  #activatedRoute = inject(ActivatedRoute);
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdAppStructure = inject(SdAppStructureProvider);
  #sdBackground = inject(SdBackgroundProvider);

  #parent = injectParent();

  containerType =
    this.#activatedRoute.component === this.#parent.constructor
      ? "page"
      : this.#sdActivatedModal
        ? "modal"
        : "control";

  isLastPage = $computed(() =>
    this.#activatedRoute.pathFromRoot.slice(2).map(item => item.snapshot.url).join(".") === this.pageCode(),
  );

  pageCode = injectPageCode$();
  title = $computed(() =>
    this.#sdActivatedModal
      ? this.#sdActivatedModal.modal.title()
      : this.#sdAppStructure.getTitleByCode(this.pageCode()),
  );

  busy = input(false, { transform: transformBoolean });
  initialized = input(true, { transform: transformBoolean });
  denied = input(false, { transform: transformBoolean });
  noEffect = input(false, { transform: transformBoolean });
  bgGrey = input(false, { transform: transformBoolean });

  topbarTemplateRef = contentChild("topbarTemplate", { read: TemplateRef });
  contentTemplateRef = contentChild("contentTemplate", { read: TemplateRef });

  constructor() {
    $effect([this.initialized], () => {
      if (this.containerType === "modal") {
        if (this.initialized()) {
          this.#sdActivatedModal!.content.open();
        }
      }
    });

    $effect([this.bgGrey], () => {
      this.#sdBackground.theme.set(this.bgGrey() ? "grey" : undefined);
    });
  }

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
