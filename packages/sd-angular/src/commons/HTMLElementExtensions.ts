import {SdMutationEvent} from "./SdMutationEvent";
import {ResizeEvent} from "./ResizeEvent";

declare global {
  // tslint:disable-next-line:interface-name
  interface HTMLElement {
    readonly windowOffset: { top: number; left: number };

    getRelativeOffset(parentElement: Element): { top: number; left: number };

    getRelativeOffset(parentSelector: string): { top: number; left: number };

    getRelativeOffset(): { top: number; left: number };
  }
}

Object.defineProperty(HTMLElement.prototype, "windowOffset", {
  get(this: HTMLElement): { top: number; left: number } {
    let cursor = this;
    let top = cursor.offsetTop;
    let left = cursor.offsetLeft;
    while (cursor.offsetParent) {
      cursor = cursor.offsetParent as HTMLElement;
      top += cursor.offsetTop;
      left += cursor.offsetLeft;
    }

    cursor = this;
    while (cursor.parentElement) {
      cursor = cursor.parentElement as HTMLElement;
      top -= cursor.scrollTop;
      left -= cursor.scrollLeft;
    }

    return {top, left};
  }
});

HTMLElement.prototype.getRelativeOffset = function (arg?: string | Element): { top: number; left: number } {
  const parentEl = arg ? this.findParent(arg as any) : undefined;

  let cursor = this;
  let top = cursor.offsetTop;
  let left = cursor.offsetLeft;
  while (cursor.offsetParent && cursor.offsetParent !== parentEl) {
    cursor = cursor.offsetParent as HTMLElement;
    top += cursor.offsetTop;
    left += cursor.offsetLeft;
  }

  cursor = this;
  while (cursor.parentElement) {
    cursor = cursor.parentElement as HTMLElement;
    top -= cursor.scrollTop;
    left -= cursor.scrollLeft;
  }

  return {top, left};
};

HTMLElement.prototype["orgAddEventListener"] = HTMLElement.prototype["orgAddEventListener"] || HTMLElement.prototype.addEventListener;
HTMLElement.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
  if (type === "resize") {
    let prevWidth = this.offsetWidth;
    let prevHeight = this.offsetHeight;

    if (window["ResizeObserver"]) {
      const observer = new window["ResizeObserver"](() => {
        const dimensions: ("width" | "height")[] = [];

        if (prevWidth !== this.offsetWidth) {
          dimensions.push("width");
          prevWidth = this.offsetWidth;
        }

        if (prevHeight !== this.offsetHeight) {
          dimensions.push("height");
          prevHeight = this.offsetHeight;
        }

        if (dimensions.length > 0) {
          const event = new CustomEvent("resize", {detail: {dimensions}}) as ResizeEvent;
          if (listener["handleEvent"]) {
            (listener as EventListenerObject).handleEvent(event);
          }
          else {
            (listener as EventListener)(event);
          }
        }
      });
      observer.observe(this);
    }
    else {
      const timeout = window.setInterval(() => {
        const dimensions: ("width" | "height")[] = [];

        if (prevWidth !== this.offsetWidth) {
          dimensions.push("width");
          prevWidth = this.offsetWidth;
        }
        if (prevHeight !== this.offsetHeight) {
          dimensions.push("height");
          prevHeight = this.offsetHeight;
        }

        if (dimensions.length > 0) {
          const event = new CustomEvent("resize", {detail: {dimensions}}) as ResizeEvent;
          if (listener["handleEvent"]) {
            (listener as EventListenerObject).handleEvent(event);
          }
          else {
            (listener as EventListener)(event);
          }
        }
      }, 100);

      const removedEventListener = (e: Event) => {
        if (this === e.target || this.findParent(e.target as Element)) {
          window.clearTimeout(timeout);
          document.body.removeEventListener("DOMNodeRemoved", removedEventListener);
        }
      };
      document.body.addEventListener("DOMNodeRemoved", removedEventListener);
    }
  }
  else if (type === "mutation") {
    if (window["MutationObserver"]) {
      const observer = new MutationObserver(mutations => {
        const event = new CustomEvent("mutation", {detail: {mutations}}) as SdMutationEvent;
        if (listener["handleEvent"]) {
          (listener as EventListenerObject).handleEvent(event);
        }
        else {
          (listener as EventListener)(event);
        }
      });
      observer.observe(this, {
        childList: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true
      });
    }
    else {
      throw new Error("지원하지 않는 브라우져 입니다." + (process.env.NODE_ENV === "production" ? "" : "(MutationObserver)"));
    }
  }
  else {
    this["orgAddEventListener"](type, listener, options);
  }
};
