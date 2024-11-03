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
import { SdTopbarContainerControl } from "../controls/SdTopbarContainerControl";
import { SdTopbarControl } from "../controls/SdTopbarControl";
import { NgTemplateOutlet } from "@angular/common";
import { $computed } from "../utils/$hooks";
import { SdActivatedModalProvider } from "../providers/SdModalProvider";

@Component({
  selector: "sd-modal-base",
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
          <sd-pane class="tx-theme-grey-light p-xxl tx-center">
            <br />
            <fa-icon [icon]="faTriangleExclamation" [fixedWidth]="true" size="5x" />
            <br />
            <br />
            {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </sd-pane>
        } @else {
          <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
        }
      }
    </sd-busy-container>
  `,
})
export class SdModalBaseControl {
  #sdActivatedModal = inject(SdActivatedModalProvider);

  busy = input(false);
  initialized = input(true);
  denied = input(false);

  contentTemplateRef = contentChild.required("contentTemplate", { read: TemplateRef });

  title = $computed(() => this.#sdActivatedModal.modal.title());

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
