// tslint:disable-next-line:interface-name
declare interface HTMLElement {
  prependChild<T extends Node>(newChild: T): T;

  findAll(selector: string): HTMLElement[];

  findParent(selector: string): HTMLElement | undefined;
}

HTMLElement.prototype.prependChild = function <T extends Node>(newChild: T): T {
  return this.insertBefore(newChild, this.childNodes.item(0));
};

HTMLElement.prototype.findAll = function (selector: string): HTMLElement[] {
  return Array.from(this.querySelectorAll(selector.split(",").map(item => `:scope ${item}`).join(","))).ofType(HTMLElement);
};

HTMLElement.prototype.findParent = function (selector: string): HTMLElement | undefined {
  let cursor = this.parentElement;
  while (cursor) {
    if (cursor.matches(selector)) {
      break;
    }

    cursor = cursor.parentElement;
  }

  return cursor || undefined;
};