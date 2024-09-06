import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  inject,
  Input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdTopbarContainerControl } from "./SdTopbarContainerControl";
import { SdTopbarControl } from "./SdTopbarControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { coercionBoolean } from "../utils/commons";
import { SdIconControl } from "./SdIconControl";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-page-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTopbarContainerControl, SdTopbarControl, NgTemplateOutlet, SdBusyContainerControl, SdIconControl],
  template: `
    <sd-topbar-container>
      <sd-topbar>
        <h4>{{ title }}</h4>

        @if (hasPerm) {
          <ng-template [ngTemplateOutlet]="topbarMenuTemplateRef ?? null" />
        }
      </sd-topbar>

      @if (!hasPerm) {
        <div class="p-xxl" style="font-size: 48px; line-height: 1.5em">
          <sd-icon [icon]="icons.triangleExclamation" fixedWidth />
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

  @Input({ required: true }) title!: string;
  @Input({ transform: coercionBoolean }) hasPerm = true;

  @ContentChild("topbarMenu") topbarMenuTemplateRef?: TemplateRef<void>;
}
