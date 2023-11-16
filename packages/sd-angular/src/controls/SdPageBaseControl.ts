import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef} from "@angular/core";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdTopbarControl} from "./SdTopbarControl";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {coercionBoolean, coercionNonNullableNumber} from "../utils/commons";
import {faTriangleExclamation} from "@fortawesome/pro-duotone-svg-icons";
import {SdIconControl} from "./SdIconControl";
import {SdContentBoxControl} from "./SdContentBoxControl";

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
    <sd-topbar-container>
      <sd-topbar>
        <h4>{{ title }}</h4>

        <ng-container *ngIf="isInitialized && hasPermission">
          <ng-template [ngTemplateOutlet]="topbarMenuTemplateRef"/>
        </ng-container>
      </sd-topbar>

      <sd-busy-container [busy]="busyCount > 0 || !isInitialized">
        <ng-container *ngIf="isInitialized">
          <ng-container *ngIf="!hasPermission">
            <div class="p-xxl" style="font-size: 48px; line-height: 1.5em">
              <sd-icon [icon]="faTriangleExclamation" fixedWidth/>
              이 메뉴의 사용권한이 없습니다.<br/>
              시스템 관리자에게 문의하세요.
            </div>
          </ng-container>

          <ng-container *ngIf="hasPermission">
            <ng-content/>
          </ng-container>
        </ng-container>
      </sd-busy-container>
    </sd-topbar-container>`,
  styles: [/* language=SCSS */ `
  `]
})
export class SdPageBaseControl {
  @Input()
  title?: string;

  @Input({transform: coercionBoolean})
  isInitialized = false;

  @Input({transform: coercionNonNullableNumber})
  busyCount = 0;

  @Input({transform: coercionBoolean})
  hasPermission = false;

  @ContentChild("topbarMenu", {static: true})
  topbarMenuTemplateRef: TemplateRef<void> | null = null;

  protected readonly faTriangleExclamation = faTriangleExclamation;
}