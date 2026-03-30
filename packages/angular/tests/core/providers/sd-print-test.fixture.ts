import { Component, input, signal } from "@angular/core";
import type { ISdPrint } from "../../../src/core/providers/sd-print.provider";

/**
 * 기본 인쇄 테스트 컴포넌트 (즉시 initialized)
 */
@Component({
  selector: "sd-print-test-basic",
  standalone: true,
  template: `<div class="print-content" style="width: 200px; height: 100px; background: white;">{{ title() }}</div>`,
  host: { style: "display: block" },
})
export class SdPrintTestBasic implements ISdPrint {
  title = input("기본 제목");
  initialized = signal(true);
}

/**
 * 이미지 포함 인쇄 테스트 컴포넌트
 */
@Component({
  selector: "sd-print-test-with-images",
  standalone: true,
  template: `
    <div class="print-content">
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="test1" />
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="test2" />
    </div>
  `,
})
export class SdPrintTestWithImages implements ISdPrint {
  initialized = signal(true);
}

/**
 * 지연 초기화 테스트 컴포넌트 — 테스트에서 SdPrintTestDelayed.latestInstance로 접근 가능
 */
@Component({
  selector: "sd-print-test-delayed",
  standalone: true,
  template: `<div class="print-content">지연 컴포넌트</div>`,
})
export class SdPrintTestDelayed implements ISdPrint {
  static latestInstance: SdPrintTestDelayed | undefined;

  initialized = signal(false);

  constructor() {
    SdPrintTestDelayed.latestInstance = this;
  }
}

/**
 * 멀티 페이지 PDF 테스트 컴포넌트
 */
@Component({
  selector: "sd-print-test-multi-page",
  standalone: true,
  template: `
    <div class="page" style="width: 200px; height: 100px; background: white;">Page 1</div>
    <div class="page" style="width: 200px; height: 100px; background: white;">Page 2</div>
    <div class="page" style="width: 200px; height: 100px; background: white;">Page 3</div>
  `,
})
export class SdPrintTestMultiPage implements ISdPrint {
  initialized = signal(true);
}

/**
 * 이미지 없는 컴포넌트
 */
@Component({
  selector: "sd-print-test-no-images",
  standalone: true,
  template: `<div class="print-content" style="width: 200px; height: 100px; background: white;">텍스트만</div>`,
  host: { style: "display: block" },
})
export class SdPrintTestNoImages implements ISdPrint {
  initialized = signal(true);
}
