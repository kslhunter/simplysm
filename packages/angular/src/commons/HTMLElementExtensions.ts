// tslint:disable-next-line:interface-name
declare interface HTMLElement {
  readonly windowOffset: { top: number; left: number };
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