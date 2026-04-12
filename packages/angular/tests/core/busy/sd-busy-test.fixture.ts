import { Component, signal } from "@angular/core";
import { SdBusyContainer } from "../../../src/core/busy/sd-busy-container";
import type { SdBusyType } from "../../../src/core/busy/sd-busy.provider";

/**
 * 기본 busy container 테스트 (busy, type)
 */
@Component({
  selector: "sd-busy-test-default",
  standalone: true,
  imports: [SdBusyContainer],
  template: `
    <sd-busy-container [busy]="busy()" [type]="type()">
      <div class="_content">콘텐츠</div>
    </sd-busy-container>
  `,
})
export class SdBusyTestDefault {
  busy = signal(false);
  type = signal<SdBusyType | undefined>(undefined);
}

/**
 * message 테스트
 */
@Component({
  selector: "sd-busy-test-message",
  standalone: true,
  imports: [SdBusyContainer],
  template: `
    <sd-busy-container [busy]="busy()" [message]="message()">
      <div class="_content">콘텐츠</div>
    </sd-busy-container>
  `,
})
export class SdBusyTestMessage {
  busy = signal(true);
  message = signal<string | undefined>(undefined);
}

/**
 * progressPercent 테스트
 */
@Component({
  selector: "sd-busy-test-progress",
  standalone: true,
  imports: [SdBusyContainer],
  template: `
    <sd-busy-container [busy]="busy()" [progressPercent]="progressPercent()">
      <div class="_content">콘텐츠</div>
    </sd-busy-container>
  `,
})
export class SdBusyTestProgress {
  busy = signal(true);
  progressPercent = signal<number | undefined>(undefined);
}

/**
 * SdBusyProvider 테스트용 호스트
 */
@Component({
  selector: "sd-busy-provider-test-host",
  standalone: true,
  template: `<div class="host"></div>`,
})
export class SdBusyProviderTestHost {}
