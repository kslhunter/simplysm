import { ISdMutationEvent, ISdResizeEvent } from "./events";

declare global {
  interface HTMLElement {
    repaint(): void;

    getRelativeOffset(parentElement: HTMLElement): { top: number; left: number };

    getRelativeOffset(parentSelector: string): { top: number; left: number };

    addEventListener(type: "mutation", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "mutation-child", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "mutation-character", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    addEventListener(type: "resize", listener: (event: ISdResizeEvent) => any, options?: boolean | AddEventListenerOptions): void;

    removeEventListener(type: "mutation", listener: (event: ISdMutationEvent) => any, options?: boolean | AddEventListenerOptions): void;

    removeEventListener(type: "resize", listener: (event: ISdResizeEvent) => any, options?: boolean | AddEventListenerOptions): void;
  }
}

HTMLElement.prototype.repaint = function (this: HTMLElement): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  this.offsetHeight;
};

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

  return {top, left};
};


interface IResizeRecord {
  prevWidth: number;
  prevHeight: number;
  listenerInfos: { listener: ((event: any) => any) | EventListenerObject; options?: boolean | AddEventListenerOptions }[];
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const rect = entry.contentRect;

    const resizeRecord = entry.target["__sd-resize__"] as IResizeRecord | undefined;
    if (!resizeRecord) continue;

    const event = new CustomEvent("resize") as any;
    event.prevWidth = resizeRecord.prevWidth;
    event.prevHeight = resizeRecord.prevHeight;
    event.newWidth = rect.width;
    event.newHeight = rect.height;
    event.relatedTarget = this;

    resizeRecord.prevWidth = rect.width;
    resizeRecord.prevHeight = rect.height;

    if (event.newWidth !== event.prevWidth || event.newHeight !== event.prevHeight) {
      for (const listenerInfo of resizeRecord.listenerInfos) {
        if ("handleEvent" in listenerInfo.listener) {
          listenerInfo.listener.handleEvent(event);
        }
        else {
          listenerInfo.listener(event);
        }
      }
    }
  }
});

const orgAddEventListener = HTMLElement.prototype.addEventListener;
HTMLElement.prototype.addEventListener = function (type: string, listener: ((event: any) => any) | EventListenerObject, options?: boolean | AddEventListenerOptions): void {
  if (type === "resize") {
    if (options === true) {
      throw new Error("resize 이벤트는 children 의 이벤트를 가져올 수 없습니다.");
    }

    let resizeRecord = this["__sd-resize__"] as IResizeRecord | undefined;

    if (!resizeRecord) {
      resizeRecord = this["__sd-resize__"] = this["__sd-resize__"] ?? {
        prevWidth: 0,
        prevHeight: 0,
        listenerInfos: []
      };

      resizeRecord!.listenerInfos.push({ listener, options });
      resizeObserver.observe(this);
    }
    else {
      if (resizeRecord.listenerInfos.some((item) => item.listener === listener && item.options === options)) {
        return;
      }
      resizeRecord.listenerInfos.push({ listener, options });
    }
  }
  else if (type === "mutation") {
    if (this["__mutationEventListeners__"]?.some((item) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver((mutations) => {
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
    if (this["__mutationChildEventListeners__"]?.some((item) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver((mutations) => {
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
    if (this["__mutationCharacterEventListeners__"]?.some((item) => item.listener === listener && item.options === options) === true) {
      return;
    }


    const observer = new window.MutationObserver((mutations) => {
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
    const resizeRecord = this["__sd-resize__"] as IResizeRecord | undefined;
    if (!resizeRecord) return;

    const listenerInfo = resizeRecord.listenerInfos.single((item) => item.listener === listener && item.options === options);
    if (listenerInfo) {
      resizeRecord.listenerInfos.remove(listenerInfo);
    }

    if (resizeRecord.listenerInfos.length === 0) {
      resizeObserver.unobserve(this);
      delete this["__sd-resize__"];
    }
  }
  else if (type === "mutation") {
    const obj = this["__mutationEventListeners__"]?.single((item) => item.listener === listener && item.options === options);
    if (obj !== undefined) {
      obj.observer.disconnect();
      this["__mutationEventListeners__"].remove(obj);
    }
  }
  else if (type === "mutation-child") {
    const obj = this["__mutationChildEventListeners__"]?.single((item) => item.listener === listener && item.options === options);
    if (obj !== undefined) {
      obj.observer.disconnect();
      this["__mutationChildEventListeners__"].remove(obj);
    }
  }
  else {
    orgRemoveEventListener.bind(this)(type, listener, options);
  }
};
