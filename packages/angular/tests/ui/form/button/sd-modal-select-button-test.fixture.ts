import { Component, input, output, signal } from "@angular/core";
import {
  SdModalSelectButtonControl,
  type ISdSelectModal,
  type ISelectModalOutputResult,
  type TSdSelectModalInfo,
} from "../../../../src/ui/form/button/sd-modal-select-button.control";

export interface ITestModalItem {
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
export class TestSelectModalComponent implements ISdSelectModal<ITestModalItem> {
  initialized = signal(false);
  close = output<ISelectModalOutputResult<ITestModalItem> | undefined>();
  selectMode = input<"single" | "multi" | undefined>("single");
  selectedItemKeys = input<any[]>([]);
}

const TEST_MODAL_INFO: TSdSelectModalInfo<TestSelectModalComponent> = {
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
  imports: [SdModalSelectButtonControl],
  template: `
    <sd-modal-select-button
      [selectMode]="'single'"
      [(value)]="value"
      [(selectedItems)]="selectedItems"
      [modal]="modalInfo"
    >
      {{ displayText() }}
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonSingleTest {
  value = signal<number | undefined>(undefined);
  selectedItems = signal<ITestModalItem[]>([]);
  modalInfo = TEST_MODAL_INFO;
  displayText = signal("선택하세요");
}

/**
 * multi 모드 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-multi-test",
  standalone: true,
  imports: [SdModalSelectButtonControl],
  template: `
    <sd-modal-select-button
      [selectMode]="'multi'"
      [(value)]="value"
      [(selectedItems)]="selectedItems"
      [modal]="modalInfo"
    >
      {{ displayText() }}
    </sd-modal-select-button>
  `,
})
export class SdModalSelectButtonMultiTest {
  value = signal<number[]>([]);
  selectedItems = signal<ITestModalItem[]>([]);
  modalInfo = TEST_MODAL_INFO;
  displayText = signal("선택하세요");
}

/**
 * disabled 테스트 호스트
 */
@Component({
  selector: "sd-modal-select-button-disabled-test",
  standalone: true,
  imports: [SdModalSelectButtonControl],
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
  imports: [SdModalSelectButtonControl],
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
  imports: [SdModalSelectButtonControl],
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
 * multi 모드 + required=false + 값 있는 상태 (취소 버튼 표시 확인)
 */
@Component({
  selector: "sd-modal-select-button-multi-erasable-test",
  standalone: true,
  imports: [SdModalSelectButtonControl],
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
