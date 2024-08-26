import {ChangeDetectionStrategy, Component, inject, Input, ViewEncapsulation} from "@angular/core";
import {SdBusyContainerControl} from "./container/SdBusyContainerControl";
import {coercionBoolean} from "../utils/commons";
import {SdIconControl} from "./SdIconControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdIconControl
  ],
  template: `
    @if (!hasPerm) {
      <div class="tx-theme-grey-light p-xxl"
           style="text-align: center">
        <br/>
        <sd-icon [icon]="icons.triangleExclamation" fixedWidth size="5x"/>
        <br/>
        <br/>
        이 기능의 사용권한이 없습니다.
        시스템 관리자에게 문의하세요.
      </div>
    } @else {
      <ng-content/>
    }`
})
export class SdModalBaseControl {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input({transform: coercionBoolean}) hasPerm = false;
}