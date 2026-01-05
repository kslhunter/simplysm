declare interface Element {
  prependChild<T extends Element>(newChild: T): T;

  findAll<T extends Element>(selector: string): T[];

  findAll(selector: string): Element[];

  findFirst<T extends Element>(selector: string): T | undefined;

  findFirst(selector: string): Element | undefined;

  getParents(): HTMLElement[];

  /** @deprecated 대신 브라우저 내장의 'closest'를 사용하세요. **/
  findParent(selector: string): HTMLElement | undefined;

  /** @deprecated 대신 브라우저 내장의 'closest'를 사용하세요. **/
  findParent(element: Element): HTMLElement | undefined;

  isFocusable(): boolean;

  findFocusableAll(): TFocusableElement[];

  findFocusableParent(): TFocusableElement | undefined;

  findFocusableFirst(): TFocusableElement | undefined;

  isOffsetElement(): boolean;

  isVisible(): boolean;

  copyAsync(): Promise<void>;

  pasteAsync(): Promise<void>;
}

if (typeof Element.prototype.matches === "undefined" && "msMatchesSelector" in Element.prototype) {
  Element.prototype.matches = Element.prototype["msMatchesSelector"] as any;
}

Element.prototype.findParent = function (arg: string | Element): HTMLElement | undefined {
  let cursor = this.parentElement;
  while (cursor) {
    if (typeof arg === "string" && cursor.matches(arg)) {
      break;
    } else if (arg instanceof Element && arg === cursor) {
      break;
    }

    cursor = cursor.parentElement;
  }

  return cursor ?? undefined;
};

Element.prototype.getParents = function (): HTMLElement[] {
  const result: HTMLElement[] = [];

  let cursor = this.parentElement;
  while (cursor) {
    result.push(cursor);
    cursor = cursor.parentElement;
  }

  return result;
};

Element.prototype.prependChild = function <T extends Element>(newChild: T): T {
  return this.insertBefore(newChild, this.children.item(0));
};

Element.prototype.findAll = function (selector: string): Element[] {
  return Array.from(
    this.querySelectorAll(
      selector
        .split(",")
        .map((item) => `:scope ${item}`)
        .join(","),
    ),
  ).ofType(Element);
};

Element.prototype.findFirst = function (selector: string): Element | undefined {
  return (
    this.querySelector(
      selector
        .split(",")
        .map((item) => `:scope ${item}`)
        .join(","),
    ) ?? undefined
  );
};

const focusableSelectorList = [
  "a[href]:not([hidden])",
  "button:not([disabled])",
  "area[href]:not([hidden])",
  "input:not([disabled]):not([hidden]):not(.sd-invalid-input)",
  "select:not([disabled]):not([hidden])",
  "textarea:not([disabled]):not([hidden])",
  "iframe:not([hidden])",
  "object:not([hidden])",
  "embed:not([hidden])",
  "*[tabindex]:not([hidden])",
  "*[contenteditable]:not([hidden])",
];

Element.prototype.isFocusable = function (): boolean {
  return this.matches(focusableSelectorList.join(","));
};

Element.prototype.findFocusableAll = function (): TFocusableElement[] {
  return Array.from(
    this.querySelectorAll(focusableSelectorList.map((item) => `:scope ${item}`).join(",")),
  ).ofType(Element) as TFocusableElement[];
};

Element.prototype.findFocusableFirst = function (): TFocusableElement | undefined {
  return (this.querySelector(focusableSelectorList.map((item) => `:scope ${item}`).join(",")) ??
    undefined) as TFocusableElement | undefined;
};

Element.prototype.findFocusableParent = function (): TFocusableElement | undefined {
  let parentEl = this.parentElement;
  while (parentEl) {
    if (parentEl.matches(focusableSelectorList.join(","))) {
      return parentEl;
    }
    parentEl = parentEl.parentElement;
  }

  return undefined;
};

Element.prototype.isOffsetElement = function (): boolean {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(this).position);
};

Element.prototype.isVisible = function (): boolean {
  const style = getComputedStyle(this);
  return this.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
};

Element.prototype.copyAsync = async function () {
  if (!("clipboard" in navigator)) return;

  const firstInputEl = this.findFirst<HTMLInputElement>("input:not(.sd-invalid-input)");
  if (firstInputEl) {
    await navigator.clipboard.writeText(firstInputEl.value);
  } else {
    await navigator.clipboard.writeText(this.innerHTML);
  }
};

Element.prototype.pasteAsync = async function () {
  if (!("clipboard" in navigator)) return;

  const contentText = await navigator.clipboard.readText();

  const firstInputEl = this.findFirst<HTMLInputElement>("input:not(.sd-invalid-input)");
  if (firstInputEl) {
    firstInputEl.value = contentText;
  }
};

type TFocusableElement = Element & HTMLOrSVGElement;
