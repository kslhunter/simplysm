import { ElementRef, inject } from "@angular/core";

export function injectElementRef<T = HTMLElement>() {
  return inject<ElementRef<T>>(ElementRef);
}