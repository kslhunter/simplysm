import { injectElementRef } from "../injections/inject-element-ref";
import { inject, Renderer2 } from "@angular/core";
import { setSafeStyle } from "../set-safe-style";
import { Uuid } from "@simplysm/sd-core-common";
import { $effect } from "../bindings/$effect";

type TUseInvalidProps =
  | { getInvalidMessage: () => string; }
  | { inputEl: HTMLInputElement; }
  | { inputEl: HTMLInputElement; getInvalidMessage: () => string; }
  | (() => string);

export function setupInvalid(options: TUseInvalidProps) {
  const _elRef = injectElementRef<HTMLElement>();
  const _renderer = inject(Renderer2);

  const hostEl = _elRef.nativeElement;

  setSafeStyle(_renderer, hostEl, { position: "relative" });

  const indicatorEl = createIndicatorEl(_renderer, hostEl);

  const inputEl = "inputEl" in options
    ? options.inputEl
    : createInputHiddenEl(_renderer, hostEl);

  $effect(() => {
    if ("getInvalidMessage" in options) {
      inputEl.setCustomValidity(options.getInvalidMessage());
    }
    else if (typeof options === "function") {
      inputEl.setCustomValidity(options());
    }

    const isInvalid = !inputEl.checkValidity();

    if (isInvalid) {
      setSafeStyle(_renderer, indicatorEl, { display: "block" });
    }
    else {
      setSafeStyle(_renderer, indicatorEl, { display: "none" });
    }
  });
}

function createIndicatorEl(renderer: Renderer2, hostEl: HTMLElement) {
  const newEl: HTMLDivElement = renderer.createElement("div");
  setSafeStyle(renderer, newEl, {
    display: "none",
    position: "absolute",
    zIndex: "9999",
    background: "var(--theme-danger-default)",

    top: "2px",
    left: "2px",
    width: "var(--gap-sm)",
    height: "var(--gap-sm)",
    borderRadius: "100%",
  });
  renderer.insertBefore(hostEl, newEl, hostEl.firstChild);
  return newEl;
}

function createInputHiddenEl(renderer: Renderer2, hostEl: HTMLElement) {
  const newEl: HTMLInputElement = renderer.createElement("input");
  newEl.type = "text";
  newEl.name = Uuid.new().toString();
  newEl.className = "sd-invalid-input";
  setSafeStyle(renderer, newEl, {
    position: "absolute",
    left: "2px",
    bottom: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
  });

  renderer.listen(newEl, "focus", () => {
    const focusableElement =
      (hostEl.isFocusable() ? hostEl : hostEl.findFocusableFirst()) ??
      hostEl.findFocusableParent();
    if (focusableElement) {
      focusableElement.focus();
    }
  });

  renderer.appendChild(hostEl, newEl);
  return newEl;
}
