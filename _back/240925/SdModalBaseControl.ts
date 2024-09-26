import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainerControl, FaIconComponent],
  template: `
    @if (!hasPerm()) {
      <div class="tx-theme-grey-light p-xxl" style="text-align: center">
        <br />
        <fa-icon [icon]="icons.triangleExclamation" [fixedWidth]="true" size="5x" />
        <br />
        <br />
        이 기능의 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </div>
    } @else {
      <ng-content />
    }
  `,
})
export class SdModalBaseControl {
  icons = inject(SdAngularConfigProvider).icons;

  hasPerm = input(false);
}
