// tslint:disable-next-line:interface-name
declare interface Element {
  prependChild<T extends Node>(newChild: T): T;

  findAll(selector: string): Element[];

  findParent(element: Element): Element | undefined;

  findParent(selector: string): Element | undefined;

  findFocusableAll(): HTMLElement[];

  findFocusableAllIncludeMe(): HTMLElement[];
}

Element.prototype.prependChild = function <T extends Node>(newChild: T): T {
  return this.insertBefore(newChild, this.childNodes.item(0));
};

Element.prototype.findAll = function (selector: string): Element[] {
  return Array.from(this.querySelectorAll(selector.split(",").map(item => `:scope ${item}`).join(","))).ofType(Element);
};

Element.prototype.findParent = function (arg: string | Element): Element | undefined {
  let cursor = this.parentElement;
  while (cursor) {
    if (typeof arg === "string" && cursor.matches(arg)) {
      break;
    }
    else if (arg instanceof Element && arg === cursor) {
      break;
    }

    cursor = cursor.parentElement;
  }

  return cursor || undefined;
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

Element.prototype.findFocusableAll = function (): HTMLElement[] {
  return Array.from(this.querySelectorAll(focusableSelectorList.map(item => `:scope ${item}`).join(", "))).ofType(HTMLElement);
};

Element.prototype.findFocusableAllIncludeMe = function (): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (this.matches(focusableSelectorList.join(", "))) {
    result.push(this as HTMLElement);
  }

  result.pushRange(this.findFocusableAll());
  return result;
};
