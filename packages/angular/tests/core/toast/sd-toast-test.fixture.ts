import { Component, output, signal } from "@angular/core";
import { SdToast } from "../../../src/core/toast/sd-toast";
import type { SdToastContentDef, SdToastTheme } from "../../../src/core/toast/sd-toast.provider";

/**
 * 기본 토스트 테스트 (theme, message, open)
 */
@Component({
  selector: "sd-toast-test-default",
  standalone: true,
  imports: [SdToast],
  template: `
    <sd-toast
      [(open)]="open"
      [theme]="theme()"
      [(message)]="message"
    >
    </sd-toast>
  `,
})
export class SdToastTestDefault {
  open = signal(true);
  theme = signal<SdToastTheme>("info");
  message = signal<string | undefined>("테스트 메시지");
}

/**
 * 프로그래스 토스트 테스트
 */
@Component({
  selector: "sd-toast-test-progress",
  standalone: true,
  imports: [SdToast],
  template: `
    <sd-toast
      [(open)]="open"
      [theme]="theme()"
      [(message)]="message"
      [useProgress]="true"
      [(progress)]="progress"
    >
    </sd-toast>
  `,
})
export class SdToastTestProgress {
  open = signal(true);
  theme = signal<SdToastTheme>("info");
  message = signal<string | undefined>("업로드 중");
  progress = signal(50);
}

/**
 * 프로그래스 없는 토스트 테스트
 */
@Component({
  selector: "sd-toast-test-no-progress",
  standalone: true,
  imports: [SdToast],
  template: `
    <sd-toast
      [(open)]="open"
      [theme]="theme()"
      [(message)]="message"
    >
    </sd-toast>
  `,
})
export class SdToastTestNoProgress {
  open = signal(true);
  theme = signal<SdToastTheme>("info");
  message = signal<string | undefined>("메시지");
}

/**
 * SdToastProvider 테스트용 호스트 컴포넌트
 */
@Component({
  selector: "sd-toast-provider-test-host",
  standalone: true,
  template: `<div class="host"></div>`,
})
export class SdToastProviderTestHost {}

/**
 * 커스텀 토스트 컴포넌트 (SdToastContentDef 구현)
 */
@Component({
  selector: "sd-toast-test-custom",
  standalone: true,
  template: `
    <div class="_custom-content">커스텀 토스트</div>
    <button class="_close-btn" (click)="close.emit('result')">닫기</button>
  `,
})
export class SdToastTestCustom implements SdToastContentDef<string> {
  close = output<string | undefined>();
}
