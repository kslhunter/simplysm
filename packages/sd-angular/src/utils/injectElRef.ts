import { ElementRef, inject } from "@angular/core";

export function injectElRef<T = HTMLElement>() {
  return inject<ElementRef<T>>(ElementRef);
}
