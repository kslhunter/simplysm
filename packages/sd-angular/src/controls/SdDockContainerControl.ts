import { ChangeDetectionStrategy, Component, ElementRef } from "@angular/core";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      position: relative;
      display: block;
      height: 100%;
      width: 100%;
    }
  `]
})
export class SdDockContainerControl {
  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public redraw(): void {
    const rootEl = this._elRef.nativeElement;
    const dockEls = rootEl.findAll("> sd-dock");

    let top = 0;
    let left = 0;
    let bottom = 0;
    let right = 0;
    for (const dockEl of dockEls) {
      const position = dockEl.getAttribute("sd-position");

      dockEl.style.top = top + "px";
      dockEl.style.bottom = bottom + "px";
      dockEl.style.left = left + "px";
      dockEl.style.right = right + "px";

      if (position === "top") {
        dockEl.style.bottom = "";
        top += dockEl.offsetHeight;
      }
      else if (position === "bottom") {
        dockEl.style.top = "";
        bottom += dockEl.offsetHeight;
      }
      else if (position === "left") {
        dockEl.style.right = "";
        left += dockEl.offsetWidth;
      }
      else { // right
        dockEl.style.left = "";
        right += dockEl.offsetWidth;
      }
    }

    rootEl.style.paddingTop = top + "px";
    rootEl.style.paddingBottom = bottom + "px";
    rootEl.style.paddingLeft = left + "px";
    rootEl.style.paddingRight = right + "px";
  }
}
