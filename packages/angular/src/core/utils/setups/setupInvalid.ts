import { DestroyRef, effect, ElementRef, inject, Renderer2 } from "@angular/core";
import { setSafeStyle } from "../setSafeStyle";
import { Uuid } from "@simplysm/core-common";
import { isFocusable } from "tabbable";

export function setupInvalid(getInvalidMessage: () => string): void {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  const renderer = inject(Renderer2);
  const destroyRef = inject(DestroyRef);

  const hostEl = elRef.nativeElement;

  setSafeStyle(renderer, hostEl, { position: "relative" });

  const indicatorEl = createIndicatorEl(renderer, hostEl);
  const inputEl = createInputHiddenEl(renderer, hostEl);

  const refreshValidity = (): void => {
    inputEl.setCustomValidity(getInvalidMessage());
  };

  effect(() => {
    refreshValidity();

    const isInvalid = !inputEl.checkValidity();
    setSafeStyle(renderer, indicatorEl, { display: isInvalid ? "block" : "none" });
  });

  const formEl = inputEl.form;
  if (formEl == null) return;

  formEl.addEventListener("submit", refreshValidity, { capture: true });
  destroyRef.onDestroy(() => {
    formEl.removeEventListener("submit", refreshValidity, { capture: true });
  });
}

function createIndicatorEl(renderer: Renderer2, hostEl: HTMLElement): HTMLDivElement {
  const newEl: HTMLDivElement = renderer.createElement("div");
  setSafeStyle(renderer, newEl, {
    display: "none",
    position: "absolute",
    zIndex: "1",
    background: "var(--theme-danger-default)",

    top: "var(--gap-xs)",
    left: "var(--gap-xs)",
    width: "var(--gap-sm)",
    height: "var(--gap-sm)",
    borderRadius: "100%",

    userSelect: "none",
  });
  renderer.insertBefore(hostEl, newEl, hostEl.firstChild);
  return newEl;
}

function createInputHiddenEl(renderer: Renderer2, hostEl: HTMLElement): HTMLInputElement {
  const newEl: HTMLInputElement = renderer.createElement("input");
  newEl.type = "text";
  newEl.name = Uuid.generate().toString();
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

    userSelect: "none",
  });

  renderer.listen(newEl, "focus", () => {
    const focusableElement =
      (isFocusable(hostEl) ? hostEl : hostEl.findFirstFocusableChild()) ??
      hostEl.findFocusableParent();
    if (focusableElement !== undefined) {
      focusableElement.focus();
    }
  });

  renderer.appendChild(hostEl, newEl);
  return newEl;
}
