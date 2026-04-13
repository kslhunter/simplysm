import { Component, input, output, signal } from "@angular/core";
import { type SdModalContentDef } from "../../../src/core/modal/sd-modal.provider";
import { SdModal } from "../../../src/core/modal/sd-modal";

/**
 * 테스트용 모달 컴포넌트 (string 결과 반환)
 */
@Component({
  selector: "sd-modal-test-basic",
  standalone: true,
  template: `<div class="content">{{ title() }}</div>`,
})
export class SdModalTestBasic implements SdModalContentDef<string> {
  readonly _optionalModalInputs?: "age";
  initialized = signal(false);
  close = output<string | undefined>();
  title = input.required<string>();
  age = input(0);
}

/**
 * SdModal 기본 테스트 (backdrop + ESC + close button 활성)
 */
@Component({
  selector: "sd-modal-test-control-default",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="open()" [title]="'Test'" (closeRequest)="onClose()">
      <div class="modal-body">body content</div>
    </sd-modal>
  `,
})
export class SdModalTestControlDefault {
  open = signal(true);
  closed = false;
  onClose() {
    this.closed = true;
    this.open.set(false);
  }
}

/**
 * backdrop 닫기 비활성화
 */
@Component({
  selector: "sd-modal-test-no-backdrop",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="true" [title]="'Test'" [useCloseByBackdrop]="false" (closeRequest)="onClose()">
      <div class="modal-body">body</div>
    </sd-modal>
  `,
})
export class SdModalTestNoBackdrop {
  closed = false;
  onClose() {
    this.closed = true;
  }
}

/**
 * ESC 닫기 비활성화
 */
@Component({
  selector: "sd-modal-test-no-esc",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="true" [title]="'Test'" [useCloseByEscapeKey]="false" (closeRequest)="onClose()">
      <div class="modal-body">body</div>
    </sd-modal>
  `,
})
export class SdModalTestNoEsc {
  closed = false;
  onClose() {
    this.closed = true;
  }
}

/**
 * 닫기 버튼 숨김
 */
@Component({
  selector: "sd-modal-test-hide-close",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="true" [title]="'Test'" [hideCloseButton]="true">
      <div class="modal-body">body</div>
    </sd-modal>
  `,
})
export class SdModalTestHideCloseButton {}

/**
 * 헤더 숨김
 */
@Component({
  selector: "sd-modal-test-hide-header",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="true" [title]="'Test'" [hideHeader]="true">
      <div class="modal-body">body</div>
    </sd-modal>
  `,
})
export class SdModalTestHideHeader {}

/**
 * movable 모달 테스트
 */
@Component({
  selector: "sd-modal-test-movable",
  standalone: true,
  imports: [SdModal],
  template: `
    <sd-modal [open]="true" [title]="'Test'" [movable]="true" (closeRequest)="onClose()">
      <div class="modal-body">body content</div>
    </sd-modal>
  `,
})
export class SdModalTestMovable {
  closed = false;
  onClose() {
    this.closed = true;
  }
}

/**
 * 생성자에서 에러를 던지는 모달 컴포넌트 (DESIGN-003 테스트용)
 */
@Component({
  selector: "sd-modal-test-throw",
  standalone: true,
  template: `<div>error</div>`,
})
export class SdModalTestThrow implements SdModalContentDef<void> {
  initialized = signal(false);
  close = output<void | undefined>();

  constructor() {
    throw new Error("Component creation failed");
  }
}

/**
 * SdModalProvider.showAsync 테스트용 호스트 컴포넌트
 */
@Component({
  selector: "sd-modal-provider-test-host",
  standalone: true,
  template: `<div class="host"></div>`,
})
export class SdModalProviderTestHost {
}

/**
 * 탭 이동 가능한 요소가 있는 모달 컴포넌트
 */
@Component({
  selector: "sd-modal-test-tabbable",
  standalone: true,
  template: `
    <input class="first-input" type="text" />
    <button class="middle-btn">middle</button>
    <input class="last-input" type="text" />
  `,
})
export class SdModalTestTabbable implements SdModalContentDef<void> {
  readonly _optionalModalInputs?: "title";
  initialized = signal(false);
  close = output<void | undefined>();
  title = input("");
}

/**
 * 포커스 테스트용 호스트 (이전 포커스 복귀 확인용)
 */
@Component({
  selector: "sd-modal-focus-test-host",
  standalone: true,
  template: `<button class="trigger-btn">Open Modal</button>`,
})
export class SdModalFocusTestHost {
}
