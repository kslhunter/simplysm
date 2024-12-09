import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdPaneControl } from "../../controls/layout/sd-pane.control";
import { $computed } from "../../utils/$hooks";
import { SdActivatedModalProvider } from "../../controls/modal/sd-modal.provider";
import { SdIconControl } from "../../controls/icon/sd-icon.control";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: "sd-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdIconControl,
  ],
  template: `
    @if (!perms().includes("use")) {
      <sd-pane class="tx-theme-grey-light p-xxl tx-center">
        <br />
        <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
        <br />
        <br />
        {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </sd-pane>
    } @else {
      <ng-content />
    }
  `,
})
export class SdModalBaseControl {
  #sdActivatedModal = inject(SdActivatedModalProvider);
  #sdAppStructure = inject(SdAppStructureProvider);

  viewCodes = input.required<string[]>();
  title = $computed(() => this.#sdActivatedModal.modal.title());
  perms = $computed(() => this.#sdAppStructure.getViewPerms2(this.viewCodes(), ["use"]));

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
