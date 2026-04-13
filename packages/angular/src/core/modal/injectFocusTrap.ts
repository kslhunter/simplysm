import { ElementRef, inject } from "@angular/core";
import { isTabbable } from "tabbable";

export function injectFocusTrap(): {
  handleTabTrap: (event: KeyboardEvent) => void;
} {
  const elRef = inject(ElementRef<HTMLElement>);

  function getTabbableElements(container: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node !== null) {
      if (node instanceof HTMLElement && isTabbable(node)) {
        result.push(node);
      }
      node = walker.nextNode();
    }
    return result;
  }

  function handleTabTrap(event: KeyboardEvent): void {
    const hostEl = elRef.nativeElement;
    const tabbableElements = getTabbableElements(hostEl);
    if (tabbableElements.length === 0) return;

    const first = tabbableElements[0];
    const last = tabbableElements[tabbableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return { handleTabTrap };
}
