import { createEffect, onCleanup } from "solid-js";
import { invalidContainer, invalidDot, hiddenInputStyle } from "./invalid.css";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      /**
       * 유효성 검증 directive
       * @param accessor 에러 메시지를 반환하는 함수. 빈 문자열이면 valid 상태
       */
      invalid: () => string;
    }
  }
}

/**
 * 유효성 검증 directive
 *
 * 요소에 유효성 검증 상태를 표시하고, 폼 제출 시 브라우저 기본 동작으로 포커스 이동을 지원한다.
 *
 * @param el - directive가 적용될 HTML 요소
 * @param accessor - 에러 메시지를 반환하는 accessor. 빈 문자열이면 valid 상태
 *
 * @example
 * ```tsx
 * const [name, setName] = createSignal("");
 * const errorMessage = () => name().length === 0 ? "이름을 입력하세요" : "";
 *
 * <div use:invalid={errorMessage}>
 *   <TextField value={name()} onChange={setName} />
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // 폼과 함께 사용
 * <form onSubmit={handleSubmit}>
 *   <div use:invalid={errorMessage}>
 *     <TextField value={name()} onChange={setName} />
 *   </div>
 *   <button type="submit">제출</button>
 * </form>
 * // invalid 상태에서 제출 시 자동으로 해당 필드로 포커스 이동
 * ```
 */
export const invalid = (el: HTMLElement, accessor: () => () => string) => {
  // 1. 컨테이너 클래스 추가
  el.classList.add(invalidContainer);

  // 2. 숨겨진 input 생성 및 삽입 (폼 검증용)
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.className = hiddenInputStyle;
  hiddenInput.tabIndex = -1;
  hiddenInput.setAttribute("aria-hidden", "true");
  el.appendChild(hiddenInput);

  // 3. 검증 결과 반영
  createEffect(() => {
    const message = accessor()();
    hiddenInput.setCustomValidity(message);

    if (message !== "") {
      el.classList.add(invalidDot);
      el.setAttribute("aria-invalid", "true");
    } else {
      el.classList.remove(invalidDot);
      el.setAttribute("aria-invalid", "false");
    }
  });

  // 4. cleanup
  onCleanup(() => {
    // 요소가 이미 제거된 경우 방어 처리
    if (hiddenInput.parentNode === el) {
      el.removeChild(hiddenInput);
    }
    el.classList.remove(invalidContainer, invalidDot);
    el.removeAttribute("aria-invalid");
  });
};

// TypeScript에서 directive import 없이도 사용할 수 있도록 빈 export
export default invalid;
