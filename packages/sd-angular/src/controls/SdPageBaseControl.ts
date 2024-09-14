import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdTopbarContainerControl } from "./SdTopbarContainerControl";
import { SdTopbarControl } from "./SdTopbarControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-page-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTopbarContainerControl, SdTopbarControl, NgTemplateOutlet, SdBusyContainerControl, FaIconComponent],
  template: `
    <sd-topbar-container>
      <sd-topbar>
        <h4>{{ title() }}</h4>

        @if (hasPerm()) {
          <ng-template [ngTemplateOutlet]="topbarMenuTemplateRef() ?? null" />
        }
      </sd-topbar>

      @if (!hasPerm) {
        <div class="p-xxl" style="font-size: 48px; line-height: 1.5em">
          <fa-icon [icon]="icons.triangleExclamation" [fixedWidth]="true" />
          이 메뉴의 사용권한이 없습니다.
          <br />
          시스템 관리자에게 문의하세요.
        </div>
      } @else {
        <ng-content />
      }
    </sd-topbar-container>
  `,
})
export class SdPageBaseControl {
  icons = inject(SdAngularOptionsProvider).icons;

  title = input.required<string>();
  hasPerm = input(true);

  topbarMenuTemplateRef = contentChild<any, TemplateRef<void>>("topbarMenu", { read: TemplateRef });
}
