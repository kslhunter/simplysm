import { createEffect, onCleanup } from "solid-js";
import { invalidContainer, invalidDot, hiddenInputStyle } from "./invalid.css";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      invalid: string;
    }
  }
}

export const invalid = (el: HTMLElement, accessor: () => string) => {
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
    const message = accessor();
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
