import { createEffect, onCleanup } from "solid-js";
import { invalidContainer, invalidDot, hiddenInputStyle } from "./invalid.css";
const invalid = (el, accessor) => {
  el.classList.add(invalidContainer);
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.className = hiddenInputStyle;
  hiddenInput.tabIndex = -1;
  hiddenInput.setAttribute("aria-hidden", "true");
  el.appendChild(hiddenInput);
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
  onCleanup(() => {
    if (hiddenInput.parentNode === el) {
      el.removeChild(hiddenInput);
    }
    el.classList.remove(invalidContainer, invalidDot);
    el.removeAttribute("aria-invalid");
  });
};
var invalid_default = invalid;
export {
  invalid_default as default,
  invalid
};
//# sourceMappingURL=invalid.js.map
