import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdPaneControl } from "../../controls/layout/sd-pane.control";
import { $computed } from "../../utils/$hooks";
import { SdActivatedModalProvider } from "../../controls/modal/sd-modal.provider";
import { SdIconControl } from "../../controls/icon/sd-icon.control";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { SdBusyContainerControl } from "../../controls/busy/sd-busy-container.control";
import { transformBoolean } from "../../utils/tramsforms";
import { NgTemplateOutlet } from "@angular/common";
import { TemplateTargetDirective } from "../../directives/template-target.directive";

@Component({
  selector: "sd-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdIconControl,
    SdBusyContainerControl,
    NgTemplateOutlet,
  ],
  template: `
    <sd-busy-container [busy]="busy()">
      @if (initialized()) {
        @if (!perms().includes("use")) {
          <sd-pane class="tx-theme-grey-light p-xxl tx-center">
            <br />
            <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
            <br />
            <br />
            {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </sd-pane>
        } @else {
          <ng-template [ngTemplateOutlet]="getTemplateRef('content')" />
        }
      }
    </sd-busy-container>
  `,
})
export class SdModalBaseControl {
  #sdActivatedModal = inject(SdActivatedModalProvider);
  #sdAppStructure = inject(SdAppStructureProvider);

  viewCodes = input.required<string[]>();
  title = $computed(() => this.#sdActivatedModal.modal.title());
  perms = $computed(() => this.#sdAppStructure.getViewPerms2(this.viewCodes(), ["use"]));

  busy = input(false, { transform: transformBoolean });
  initialized = input(true, { transform: transformBoolean });

  templateDirectives = contentChildren(TemplateTargetDirective);
  getTemplateRef = (target: "content") => {
    return this.templateDirectives().single(item => item.target() === target)?.templateRef ?? null;
  };

  protected readonly faTriangleExclamation = faTriangleExclamation;
}
