import { Component, input, output, signal } from "@angular/core";
import {
  SdModalSelectButton,
  type SdSelectModal,
  type SdSelectModalInfo,
} from "../../../src/controls/button/sd-modal-select-button";
import type { SelectModalOutputResult } from "../../../src/core/select-modal-output-result";

export interface TestModalItem {
  id: number;
  name: string;
}

/**
 * 테스트용 선택 모달 컴포넌트
 */
@Component({
  selector: "sd-test-select-modal",
  standalone: true,
  template: `<div class="test-select-modal">{{ selectMode() }}</div>`,
})
export class TestSelectModalComponent implements SdSelectModal<TestModalItem> {
  initialized = signal(false);
  close = output<SelectModalOutputResult<TestModalItem> | undefined>();
  selectMode = input<"single" | "multi" | undefined>("single");
  selectedKeys = input<any[]>([]);
}

const TEST_MODAL_INFO: SdSelectModalInfo<TestSelectModalComponent> = {
  title: "항목 선택",
  type: TestSelectModalComponent,
  inputs: {},
};

/**
 * single 모드 기본 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-single-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [selectMode]="'single'"
      [(value)]="value"
      [modal]="modalInfo"
    >
      {{ displayText() }}
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonSingleTest {
  value = signal<number | undefined>(undefined);
  modalInfo = TEST_MODAL_INFO;
  displayText = signal("선택하세요");
}

/**
 * multi 모드 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-multi-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [selectMode]="'multi'"
      [(value)]="value"
      [modal]="modalInfo"
    >
      {{ displayText() }}
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonMultiTest {
  value = signal<number[]>([]);
  modalInfo = TEST_MODAL_INFO;
  displayText = signal("선택하세요");
}

/**
 * disabled 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-disabled-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [selectMode]="'single'"
      [(value)]="value"
      [modal]="modalInfo"
      [disabled]="true"
    >
      선택
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonDisabledTest {
  value = signal<number | undefined>(undefined);
  modalInfo = TEST_MODAL_INFO;
}

/**
 * required 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-required-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <form>
      <sd-modal-select-button
        [selectMode]="'single'"
        [(value)]="value"
        [modal]="modalInfo"
        [required]="true"
      >
        선택
      </sd-modal-select-button>
    </form>
  `,
})
export class SdModalSelectButtonRequiredTest {
  value = signal<number | undefined>(undefined);
  modalInfo = TEST_MODAL_INFO;
}

/**
 * required=false + 값 있는 상태 (취소 버튼 표시 확인)
 */
@Component({
  selector: "sd-modal-select-button-erasable-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [selectMode]="'single'"
      [(value)]="value"
      [modal]="modalInfo"
      [required]="false"
    >
      선택됨
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonErasableTest {
  value = signal<number | undefined>(1);
  modalInfo = TEST_MODAL_INFO;
}

/**
 * 이벤트 전파 테스트 호스트 — 부모 div에 click 리스너를 걸어 전파 여부 확인
 */
@Component({
  selector: "sd-modal-select-button-event-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <div class="parent-wrapper" tabindex="0" role="button" (click)="onParentClick()" (keydown.enter)="onParentClick()">
      <sd-modal-select-button
        [selectMode]="'single'"
        [(value)]="value"
        [modal]="modalInfo"
      >
        선택하세요
      </sd-modal-select-button>
    </div>
  `,
})
export class SdModalSelectButtonEventTest {
  value = signal<number | undefined>(undefined);
  modalInfo = TEST_MODAL_INFO;
  parentClicked = signal(false);

  onParentClick(): void {
    this.parentClicked.set(true);
  }
}

/**
 * multi 모드 + required=false + 값 있는 상태 (취소 버튼 표시 확인)
 */
@Component({
  selector: "sd-modal-select-button-multi-erasable-test",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [selectMode]="'multi'"
      [(value)]="value"
      [modal]="modalInfo"
      [required]="false"
    >
      선택됨
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonMultiErasableTest {
  value = signal<number[]>([1, 2]);
  modalInfo = TEST_MODAL_INFO;
}
