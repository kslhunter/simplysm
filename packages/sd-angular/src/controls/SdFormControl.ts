import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdToastProvider } from "../providers/SdToastProvider";
import { SdEventsDirective } from "../directives/SdEventsDirective";

/**
 * 폼 컨트롤 컴포넌트
 * 
 * HTML 폼을 래핑하고 유효성 검사와 제출을 관리하는 컴포넌트입니다.
 * 
 * 주요 기능:
 * - 폼 제출 이벤트 처리
 * - 유효성 검사 오류 처리
 * - 자동 포커스 관리
 * - 커스텀 유효성 검사 메시지 지원
 * 
 * @example
 * ```html
 * <sd-form (submit)="onSubmit()">
 *   <input type="text" required>
 *   <button type="submit">제출</button>
 * </sd-form>
 * ```
 */
@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <form #formEl (submit)="onSubmit($event)" (invalid.capture)="onInvalidCapture()">
      <ng-content />
      <button hidden type="submit"></button>
    </form>
  `,
})
export class SdFormControl {
  /** 토스트 메시지 제공자 */
  #sdToast = inject(SdToastProvider);

  /** 폼 엘리먼트에 대한 참조 */
  formElRef = viewChild.required<any, ElementRef<HTMLFormElement>>("formEl", { read: ElementRef });

  /** 폼 제출 이벤트 */
  submit = output<SubmitEvent>();
  /** 폼 유효성 검사 실패 이벤트 */
  invalid = output();

  /**
   * 폼 제출을 프로그래밍 방식으로 요청
   */
  requestSubmit() {
    this.formElRef().nativeElement.requestSubmit();
  }

  /**
   * 폼 제출 이벤트 핸들러
   * 
   * 폼 제출 시:
   * 1. 기본 동작을 방지
   * 2. 유효성 검사 수행
   * 3. 오류가 있는 경우 첫 번째 오류 필드에 포커스
   * 4. 오류 메시지 표시
   * 5. 유효한 경우 submit 이벤트 발생
   * 
   * @param event 제출 이벤트 객체
   */
  onSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();

    const firstInvalidEl = this.formElRef().nativeElement.findFirst<HTMLElement>("*:invalid, *[sd-invalid]");

    if (!firstInvalidEl) {
      this.submit.emit(event);
      return;
    }

    const sdInvalidMessage = firstInvalidEl.getAttribute("sd-invalid");
    const invalidMessage = "validationMessage" in firstInvalidEl ? firstInvalidEl.validationMessage : "";

    const errorMessage = [sdInvalidMessage, invalidMessage].filterExists().join("\n");

    const focusableElement =
      (firstInvalidEl.isFocusable() ? firstInvalidEl : firstInvalidEl.findFocusableAll().first()) ??
      firstInvalidEl.findFocusableParent();
    // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "requestAnimationFrame"이 필요함.
    if (focusableElement) {
      requestAnimationFrame(() => {
        focusableElement.focus();
      });
    }

    this.#sdToast.info(errorMessage);
    this.invalid.emit();
  }

  /**
   * 폼 유효성 검사 실패 이벤트 핸들러
   * invalid 이벤트를 발생시킵니다.
   */
  onInvalidCapture() {
    this.invalid.emit();
  }
}
