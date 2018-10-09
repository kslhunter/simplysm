import "@simplism/core";

declare global {
  // tslint:disable-next-line:interface-name
  interface Element {
    prependChild<T extends Node>(newChild: T): T;

    findAll(selector: string): Element[];

    findParent(element: Element): Element | undefined;

    findParent(selector: string): Element | undefined;

    findFocusableAll(): HTMLElement[];

    findFocusableAllIncludeMe(): HTMLElement[];
  }
}

Element.prototype.prependChild = function <T extends Node>(newChild: T): T {
  return this.insertBefore(newChild, this.childNodes.item(0));
};

Element.prototype.findAll = function (selector: string): Element[] {
  // TODO "JSDOM"에서 "scope"가 동작하지 않음, JSDOM 업데이트시 다시 테스트해볼것
  return Array.from(this.querySelectorAll(selector.split(",").map(item => `${process.env.NODE_ENV !== "test" ? ":scope " : ""}${item}`).join(","))).ofType(Element);
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

Element.prototype.findFocusableAll = function (): HTMLElement[] {
  // TODO "JSDOM"에서 "scope"가 동작하지 않음, JSDOM 업데이트시 다시 테스트해볼것
  return Array.from(this.querySelectorAll(focusableSelectorList.map(item => `${process.env.NODE_ENV !== "test" ? ":scope " : ""}${item}`).join(", "))).ofType(HTMLElement);
};

Element.prototype.findFocusableAllIncludeMe = function (): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (this.matches(focusableSelectorList.join(", "))) {
    result.push(this as HTMLElement);
  }

  result.pushRange(this.findFocusableAll());
  return result;
};