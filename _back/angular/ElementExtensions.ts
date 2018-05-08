export type DetectElementChangesTypeStrings = "dom" | "width" | "height";

declare global {
  // tslint:disable-next-line:interface-name
  interface Element {
    on<T extends Event>(eventKey: string, callback: (evt: T) => void, includeChildren?: boolean): void;

    off(eventKey: string): void;

    findParent(predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined;

    find(predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined;

    findAll(predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement[];

    findFocusable(): HTMLElement | undefined;

    findFocusableAll(): HTMLElement[];

    prependChild(child: HTMLElement): void;

    validate(): HTMLElement[];
  }
}

interface IEventListener {
  eventKey: string;
  includeChildren?: boolean | AddEventListenerOptions;

  callback(evt: Event): void;
}

const eventMap = new Map<Element, IEventListener[]>();

Element.prototype.on = function <T extends Event>(eventKey: string, callback: (evt: T) => void, includeChildren?: boolean): void {
  this.off(eventKey);
  const listeners: IEventListener[] = eventMap.get(this) || [];
  listeners.push({eventKey, callback, includeChildren});
  eventMap.set(this, listeners);

  this.addEventListener(eventKey.split(".")[0], callback as any, includeChildren);
};

Element.prototype.off = function (eventKey: string): void {
  const listeners: IEventListener[] = eventMap.get(this) || [];

  for (const listener of listeners.filter(item => item.eventKey === eventKey)) {
    this.removeEventListener(eventKey.split(".")[0], evt => {
      listener.callback(evt);
    }, listener.includeChildren);
    listeners.remove(listener);
  }
  eventMap.set(this, listeners);
};

Element.prototype.findParent = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined {
  let cursor = this.parentElement;
  while (cursor) {
    if (
      typeof predicate === "function" ? predicate(cursor)
        : typeof predicate === "string" ? cursor.matches(predicate)
        : cursor === predicate
    ) {
      break;
    }

    cursor = cursor.parentElement;
  }

  return cursor || undefined;
};

Element.prototype.find = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined {
  if (typeof predicate === "string") {
    return (this.querySelector(`:scope ${predicate}`) || undefined) as HTMLElement | undefined;
  }
  else {
    const getMatchedChild = (cursor: Element): (HTMLElement | undefined) => {
      const children = Array.from(cursor.children).ofType(HTMLElement);
      for (const child of children) {
        if (typeof predicate === "function" ? predicate(child) : child === predicate) {
          return child;
        }
      }

      for (const child of children) {
        const matchedChildChild = getMatchedChild(child);
        if (matchedChildChild) {
          return matchedChildChild;
        }
      }
    };

    return getMatchedChild(this);
  }
};

Element.prototype.findAll = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement[] {
  if (typeof predicate === "string") {
    return Array.from(this.querySelectorAll(predicate.split(",").map(item => `:scope ${item}`).join(","))).ofType(HTMLElement);
  }
  else {
    const result: HTMLElement[] = [];

    const traverseDomTree = (cursor: Element): void => {
      const children = Array.from(cursor.children).ofType(HTMLElement);

      for (const child of children) {
        if (typeof predicate === "function" ? predicate(child) : child === predicate) {
          result.push(child);
        }
      }

      for (const child of children) {
        traverseDomTree(child);
      }
    };

    traverseDomTree(this);

    return result;
  }
};

const focusableSelectorList = [
  "a[href]",
  "button:not([disabled])",
  "area[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "*[tabindex]",
  "*[contenteditable]"
];

Element.prototype.findFocusable = function (): HTMLElement | undefined {
  return (this.querySelector(focusableSelectorList.map(item => `:scope ${item}`).join(", ")) || undefined) as HTMLElement | undefined;
};

Element.prototype.findFocusableAll = function (): HTMLElement[] {
  return Array.from(this.querySelectorAll(focusableSelectorList.map(item => `:scope ${item}`).join(", "))).ofType(HTMLElement);
};

Element.prototype.prependChild = function (child: HTMLElement): void {
  this.insertBefore(child, this.children.item(0));
};

Element.prototype.validate = function (): HTMLElement[] {
  const invalidEls = this.findAll("*:invalid, *.invalid");
  if (invalidEls.length > 0) {
    invalidEls[0].focus();
  }
  return invalidEls;
};
