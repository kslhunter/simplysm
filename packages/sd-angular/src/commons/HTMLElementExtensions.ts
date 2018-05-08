interface IEventListener {
  eventKey: string;
  includeChildren?: boolean | AddEventListenerOptions;

  callback(evt: Event): void;
}

const eventMap = new Map<HTMLElement, IEventListener[]>();

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

interface HTMLElement { // tslint:disable-line:interface-name
  on<T extends Event>(eventKey: string, callback: (evt: T) => void, includeChildren?: boolean): void;

  off(eventKey: string): void;

  findParent(selector: string): HTMLElement | undefined;

  findParent(element: HTMLElement): HTMLElement | undefined; // tslint:disable-line:unified-signatures

  findParent(predicate: (el: HTMLElement) => boolean): HTMLElement | undefined; // tslint:disable-line:unified-signatures

  has(element: HTMLElement): boolean;

  find(selector: string): HTMLElement | undefined;

  find(element: HTMLElement): HTMLElement | undefined; // tslint:disable-line:unified-signatures

  find(predicate: (el: HTMLElement) => boolean): HTMLElement | undefined; // tslint:disable-line:unified-signatures

  findAll(selector: string): HTMLElement[];

  findAll(element: HTMLElement): HTMLElement[]; // tslint:disable-line:unified-signatures

  findAll(predicate: (el: HTMLElement) => boolean): HTMLElement[]; // tslint:disable-line:unified-signatures

  findFocusable(): HTMLElement | undefined;

  findFocusableAll(): HTMLElement[];

  isFocusable(): boolean;

  prependChild(child: HTMLElement): void;

  validate(): HTMLElement[];
}

HTMLElement.prototype.on = function <T extends Event>(eventKey: string, callback: (evt: T) => void, includeChildren?: boolean): void {
  this.off(eventKey);
  const listeners: IEventListener[] = eventMap.get(this) || [];
  listeners.push({eventKey, callback, includeChildren});
  eventMap.set(this, listeners);

  this.addEventListener(eventKey.split(".")[0], callback as any, includeChildren);
};

HTMLElement.prototype.off = function (eventKey: string): void {
  const listeners: IEventListener[] = eventMap.get(this) || [];

  for (const listener of listeners.filter(item => item.eventKey === eventKey)) {
    this.removeEventListener(
      eventKey.split(".")[0],
      evt => listener.callback(evt),
      listener.includeChildren
    );
    listeners.remove(listener);
  }
  eventMap.set(this, listeners);
};

HTMLElement.prototype.findParent = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined {
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

HTMLElement.prototype.has = function (element: HTMLElement): boolean {
  return !!element.findParent(this);
};

HTMLElement.prototype.find = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement | undefined {
  if (typeof predicate === "string") {
    return (this.querySelector(`:scope ${predicate}`) || undefined) as HTMLElement | undefined;
  }
  else {
    const getMatchedChild = (cursor: HTMLElement): (HTMLElement | undefined) => {
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

HTMLElement.prototype.findAll = function (predicate: string | HTMLElement | ((el: HTMLElement) => boolean)): HTMLElement[] {
  if (typeof predicate === "string") {
    return Array.from(this.querySelectorAll(predicate.split(",").map(item => `:scope ${item}`).join(","))).ofType(HTMLElement);
  }
  else {
    const result: HTMLElement[] = [];

    const traverseDomTree = (cursor: HTMLElement): void => {
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

HTMLElement.prototype.findFocusable = function (): HTMLElement | undefined {
  return (this.querySelector(focusableSelectorList.map(item => `:scope ${item}`).join(", ")) || undefined) as HTMLElement | undefined;
};

HTMLElement.prototype.findFocusableAll = function (): HTMLElement[] {
  return Array.from(this.querySelectorAll(focusableSelectorList.map(item => `:scope ${item}`).join(", "))).ofType(HTMLElement);
};

HTMLElement.prototype.isFocusable = function (): boolean {
  return this.matches(focusableSelectorList.join(", "));
};

HTMLElement.prototype.prependChild = function (child: HTMLElement): void {
  this.insertBefore(child, this.children.item(0));
};

HTMLElement.prototype.validate = function (): HTMLElement[] {
  const invalidEls = this.findAll("*:invalid, *[sd-invalid=true]");
  if (invalidEls.length > 0) {
    invalidEls[0].focus();
  }
  return invalidEls;
};
