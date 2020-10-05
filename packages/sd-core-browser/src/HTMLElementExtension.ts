import ResizeObserver from "resize-observer-polyfill";
import { ISdMutationEvent, ISdResizeEvent } from "./events";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElement {
    getRelativeOffset(parentElement: HTMLElement): { top: number; left: number };

    getRelativeOffset(parentSelector: string): { top: number; left: number };

    prependChild<T extends HTMLElement>(newChild: T): T;

    findAll(selector: string): HTMLElement[];

    findFirst(selector: string): HTMLElement | undefined;

    findParent(selector: string): HTMLElement | undefined;

    findParent(element: HTMLElement): HTMLElement | undefined;

    isFocusable(): boolean;

    findFocusableAll(): HTMLElement[];

    findFocusableParent(): HTMLElement | undefined;

    addEventListener(type: "mutation", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "mutation-child", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "mutation-character", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "resize", listener: (event: ISdResizeEvent) => any, options?: boolean | AddEventListenerOptions): void;

    removeEventListener(type: "mutation", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    removeEventListener(type: "resize", listener: (event: ISdResizeEvent) => any, options?: boolean | AddEventListenerOptions): void;
  }
}

if (HTMLElement.prototype.matches === undefined) {
  HTMLElement.prototype.matches = HTMLElement.prototype["msMatchesSelector"];
}

HTMLElement.prototype.getRelativeOffset = function (parent: HTMLElement | string): { top: number; left: number } {
  const parentEl = typeof parent === "string" ? this.findParent(parent) : parent;

  let cursor = this;
  let top = cursor.offsetTop;
  let left = cursor.offsetLeft;
  while (cursor.offsetParent && cursor.offsetParent !== parentEl) {
    cursor = cursor.offsetParent as HTMLElement;
    top += cursor.offsetTop;
    left += cursor.offsetLeft;
  }

  cursor = this;
  while (cursor.parentElement && cursor !== parentEl) {
    cursor = cursor.parentElement;
    top -= cursor.scrollTop;
    left -= cursor.scrollLeft;
  }

  return { top, left };
};

HTMLElement.prototype.findParent = function (arg: string | Element): HTMLElement | undefined {
  let cursor = this.parentElement;
  while (cursor) {
    if (typeof arg === "string" && cursor.matches(arg)) {
      break;
    }
    else if (arg instanceof HTMLElement && arg === cursor) {
      break;
    }

    cursor = cursor.parentElement;
  }

  return cursor ?? undefined;
};

HTMLElement.prototype.prependChild = function <T extends HTMLElement>(newChild: T): T {
  return this.insertBefore(newChild, this.children.item(0));
};

HTMLElement.prototype.findAll = function (selector: string): HTMLElement[] {
  return Array.from(
    this.querySelectorAll(selector.split(",").map(item => `:scope ${item}`).join(","))
  ).ofType(HTMLElement);
};

HTMLElement.prototype.findFirst = function (selector: string): HTMLElement | undefined {
  return (this.querySelector(selector.split(",").map(item => `:scope ${item}`).join(",")) as HTMLElement | undefined | null) ?? undefined;
};

const focusableSelectorList = [
  "a[href]:not([hidden])",
  "button:not([disabled]):not([hidden])",
  "area[href]:not([hidden])",
  "input:not([disabled]):not([hidden])",
  "select:not([disabled]):not([hidden])",
  "textarea:not([disabled]):not([hidden])",
  "iframe:not([hidden])",
  "object:not([hidden])",
  "embed:not([hidden])",
  "*[tabindex]:not([hidden])",
  "*[contenteditable]:not([hidden])"
];

HTMLElement.prototype.isFocusable = function (): boolean {
  return this.matches(focusableSelectorList.join(","));
};

HTMLElement.prototype.findFocusableAll = function (): HTMLElement[] {
  return Array.from(
    this.querySelectorAll(focusableSelectorList.map(item => `:scope ${item}`).join(","))
  ).ofType(HTMLElement);
};

HTMLElement.prototype.findFocusableParent = function (): HTMLElement | undefined {
  let parentEl = this.parentElement;
  while (parentEl) {
    if (parentEl.matches(focusableSelectorList.join(","))) {
      return parentEl;
    }
    parentEl = parentEl.parentElement;
  }

  return undefined;
};

const orgAddEventListener = HTMLElement.prototype.addEventListener;
HTMLElement.prototype.addEventListener = function (type: string, listener: ((event: any) => any) | EventListenerObject, options?: boolean | AddEventListenerOptions): void {
  if (type === "resize") {
    if (this["__resizeEventListeners__"]?.some((item: any) => item.listener === listener && item.options === options) === true) {
      return;
    }

    let prevWidth = this.offsetWidth;
    let prevHeight = this.offsetHeight;

    const observer = new ResizeObserver(() => {
      const event = new CustomEvent("resize") as any;
      event.prevWidth = prevWidth;
      event.newWidth = this.offsetWidth;
      event.prevHeight = prevHeight;
      event.newHeight = this.offsetHeight;
      event.relatedTarget = this;

      prevWidth = this.offsetWidth;
      prevHeight = this.offsetHeight;

      if (event.newWidth !== event.prevWidth || event.newHeight !== event.prevHeight) {
        if (listener["handleEvent"] !== undefined) {
          (listener as EventListenerObject).handleEvent(event);
        }
        else {
          (listener as EventListener)(event);
        }
      }
    });

    this["__resizeEventListeners__"] = this["__resizeEventListeners__"] ?? [];
    this["__resizeEventListeners__"].push({ listener, options, observer });


    if (options === true) {
      throw new Error("resize 이벤트는 children 의 이벤트를 가져올 수 없습니다.");
    }
    else {
      observer.observe(this);
    }
  }
  else if (type === "mutation") {
    if (this["__mutationEventListeners__"]?.some((item: any) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver(mutations => {
      const event = new CustomEvent("mutation") as any;
      event.mutations = mutations;
      event.relatedTarget = this;

      if (listener["handleEvent"] !== undefined) {
        (listener as EventListenerObject).handleEvent(event);
      }
      else {
        (listener as EventListener)(event);
      }
    });


    this["__mutationEventListeners__"] = this["__mutationEventListeners__"] ?? [];
    this["__mutationEventListeners__"].push({ listener, options, observer });

    observer.observe(this, {
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: options === true
    });
  }
  else if (type === "mutation-child") {
    if (this["__mutationChildEventListeners__"]?.some((item: any) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver(mutations => {
      const event = new CustomEvent("mutation-child") as any;
      event.mutations = mutations;
      event.relatedTarget = this;

      if (listener["handleEvent"] !== undefined) {
        (listener as EventListenerObject).handleEvent(event);
      }
      else {
        (listener as EventListener)(event);
      }
    });


    this["__mutationChildEventListeners__"] = this["__mutationChildEventListeners__"] ?? [];
    this["__mutationChildEventListeners__"].push({ listener, options, observer });

    observer.observe(this, {
      childList: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false,
      subtree: options === true
    });
  }
  else if (type === "mutation-character") {
    if (this["__mutationCharacterEventListeners__"]?.some((item: any) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver(mutations => {
      const event = new CustomEvent("mutation-character") as any;
      event.mutations = mutations;
      event.relatedTarget = this;

      if (listener["handleEvent"] !== undefined) {
        (listener as EventListenerObject).handleEvent(event);
      }
      else {
        (listener as EventListener)(event);
      }
    });


    this["__mutationCharacterEventListeners__"] = this["__mutationCharacterEventListeners__"] ?? [];
    this["__mutationCharacterEventListeners__"].push({ listener, options, observer });

    observer.observe(this, {
      childList: false,
      attributes: false,
      attributeOldValue: false,
      characterData: true,
      characterDataOldValue: true,
      subtree: options === true
    });
  }
  else {
    orgAddEventListener.bind(this)(type, listener, options);
  }
};

const orgRemoveEventListener = HTMLElement.prototype.removeEventListener;
HTMLElement.prototype.removeEventListener = function (type: string, listener: ((event: any) => any) | EventListenerObject, options?: boolean | EventListenerOptions): void {
  if (type === "resize") {
    const obj = this["__resizeEventListeners__"]?.single((item: any) => item.listener === listener && item.options === options);
    if (obj !== undefined) {
      obj.observer.disconnect();
      this["__resizeEventListeners__"].remove(obj);
    }
  }
  else if (type === "mutation") {
    const obj = this["__mutationEventListeners__"]?.single((item: any) => item.listener === listener && item.options === options);
    if (obj !== undefined) {
      obj.observer.disconnect();
      this["__mutationEventListeners__"].remove(obj);
    }
  }
  else if (type === "mutation-child") {
    const obj = this["__mutationChildEventListeners__"]?.single((item: any) => item.listener === listener && item.options === options);
    if (obj !== undefined) {
      obj.observer.disconnect();
      this["__mutationChildEventListeners__"].remove(obj);
    }
  }
  else {
    orgRemoveEventListener.bind(this)(type, listener, options);
  }
};
