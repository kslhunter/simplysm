import {ChangeDetectionStrategy, Component, contentChild, inject, input, TemplateRef} from "@angular/core";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdTopbarControl} from "./SdTopbarControl";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {SdIconControl} from "./SdIconControl";
import {SdContentBoxControl} from "./SdContentBoxControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-page-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdTopbarContainerControl,
    SdTopbarControl,
    NgTemplateOutlet,
    SdBusyContainerControl,
    NgIf,
    SdIconControl,
    SdContentBoxControl
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0 || !initialized()">
      <sd-topbar-container>
        <sd-topbar>
          <h4>{{ title() }}</h4>

          @if (initialized() && hasPerm()) {
            <ng-template [ngTemplateOutlet]="topbarMenuTemplateRef() ?? null"/>
          }
        </sd-topbar>

        @if (initialized()) {
          @if (!hasPerm()) {
            <div class="p-xxl" style="font-size: 48px; line-height: 1.5em">
              <sd-icon [icon]="icons.triangleExclamation" fixedWidth/>
              이 메뉴의 사용권한이 없습니다.<br/>
              시스템 관리자에게 문의하세요.
            </div>
          } @else {
            <ng-content/>
          }
        }
      </sd-topbar-container>
    </sd-busy-container>`
})
export class SdPageBaseControl {
  icons = inject(SdAngularOptionsProvider).icons;

  title = input.required<string>();
  initialized = input.required<boolean>();
  hasPerm = input.required<boolean>();

  busyCount = input(0);

  topbarMenuTemplateRef = contentChild<TemplateRef<void>>("topbarMenu");
}