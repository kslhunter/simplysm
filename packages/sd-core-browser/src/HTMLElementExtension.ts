declare interface HTMLElement {
  repaint(): void;

  getRelativeOffset(parentElement: HTMLElement): { top: number; left: number };

  getRelativeOffset(parentSelector: string): { top: number; left: number };
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