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
import { SdPaneControl } from "../controls/SdPaneControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { SdAppStructureProvider } from "../providers/SdAppStructureProvider";
import { SdTopbarContainerControl } from "../controls/SdTopbarContainerControl";
import { SdTopbarControl } from "../controls/SdTopbarControl";
import { NgTemplateOutlet } from "@angular/common";
import { injectPageCode$ } from "../utils/injectPageCode$";
import { $computed, $effect } from "../utils/$hooks";
import { ActivatedRoute } from "@angular/router";
import { injectParent } from "../utils/injectParent";
import { SdActivatedModalProvider } from "../providers/SdModalProvider";
import { transformBoolean } from "../utils/tramsforms";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdPaneControl,
    FaIconComponent,
    SdTopbarContainerControl,
    SdTopbarControl,
    NgTemplateOutlet,
  ],
  template: `
    <sd-busy-container [busy]="busy()">
      @if (initialized()) {
        @if (denied()) {
          <sd-pane class="tx-theme-grey-light p-xxl tx-center" [class.show-effect]="containerType !== 'modal'">
            <br />
            <fa-icon [icon]="faTriangleExclamation" [fixedWidth]="true" size="5x" />
            <br />
            <br />
            {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </sd-pane>
        } @else if (containerType) {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ title() }}</h4>

              <ng-template [ngTemplateOutlet]="topbarTemplateRef() ?? null" />
            </sd-topbar>

            <sd-pane class="show-effect">
              <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
            </sd-pane>
          </sd-topbar-container>
        } @else {
          <sd-pane [class.show-effect]="containerType !== 'modal'">
            <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
          </sd-pane>
        }
      }
    </sd-busy-container>
  `,
})
export class SdBaseContainerControl {
  #activatedRoute = inject(ActivatedRoute);
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdAppStructure = inject(SdAppStructureProvider);

  #parent = injectParent();

  containerType =
    this.#activatedRoute.component === (this.#parent as any).constructor
      ? "page"
      : this.#sdActivatedModal?.content === this.#parent
        ? "modal"
        : "control";

  pageCode = injectPageCode$();
  title = $computed(() =>
    this.#sdActivatedModal
      ? this.#sdActivatedModal.modal.title()
      : this.#sdAppStructure.getTitleByCode(this.pageCode()!),
  );

  busy = input(false, { transform: transformBoolean });
  initialized = input(true, { transform: transformBoolean });
  denied = input(false, { transform: transformBoolean });

  topbarTemplateRef = contentChild("topbarTemplate", { read: TemplateRef });
  contentTemplateRef = contentChild("contentTemplate", { read: TemplateRef });

  constructor() {
    if (this.containerType === "modal") {
      $effect([this.initialized], () => {
        if (this.initialized()) {
          this.#sdActivatedModal!.content.open();
        }
      });
    }
  }

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
