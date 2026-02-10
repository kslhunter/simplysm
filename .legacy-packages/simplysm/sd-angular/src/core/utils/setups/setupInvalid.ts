import { injectElementRef } from "../injections/injectElementRef";
import { DestroyRef, inject, Renderer2 } from "@angular/core";
import { setSafeStyle } from "../setSafeStyle";
import { $effect } from "../bindings/$effect";
import { Uuid } from "@simplysm/sd-core-common";

export function setupInvalid(getInvalidMessage: () => string) {
  const _elRef = injectElementRef<HTMLElement>();
  const _renderer = inject(Renderer2);
  const _destroyRef = inject(DestroyRef);

  const hostEl = _elRef.nativeElement;

  setSafeStyle(_renderer, hostEl, { position: "relative" });

  const indicatorEl = createIndicatorEl(_renderer, hostEl);
  const inputEl = createInputHiddenEl(_renderer, hostEl);

  const refreshValidity = () => {
    inputEl.setCustomValidity(getInvalidMessage());
  };

  $effect(() => {
    refreshValidity();

    const isInvalid = !inputEl.checkValidity();
    setSafeStyle(_renderer, indicatorEl, { display: isInvalid ? "block" : "none" });
  });

  const formEl = inputEl.form;
  if (!formEl) return;

  formEl.addEventListener("submit", refreshValidity, { capture: true });
  _destroyRef.onDestroy(() => {
    formEl.removeEventListener("submit", refreshValidity, { capture: true } as any);
  });
}

function createIndicatorEl(renderer: Renderer2, hostEl: HTMLElement) {
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

    userSelect: "none",
  });

  renderer.listen(newEl, "focus", () => {
    const focusableElement =
      (hostEl.isFocusable() ? hostEl : hostEl.findFocusableFirst()) ?? hostEl.findFocusableParent();
    if (focusableElement) {
      focusableElement.focus();
    }
  });

  renderer.appendChild(hostEl, newEl);
  return newEl;
}
