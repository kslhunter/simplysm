import { Renderer2 } from "@angular/core";

export function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
) {
  for (const styleKey of Object.keys(style)) {
    renderer.setStyle(el, styleKey, style[styleKey]);
  }
}