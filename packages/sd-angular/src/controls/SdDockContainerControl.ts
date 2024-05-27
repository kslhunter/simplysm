import {ChangeDetectionStrategy, Component, contentChildren, effect, ElementRef, inject} from "@angular/core";
import {SdDockControl} from "./SdDockControl";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content/>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
  `]
})
export class SdDockContainerControl {
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  dockControls = contentChildren(SdDockControl);

  constructor() {
    effect(() => {
      this.redrawOutside();
    });
  }

  redrawOutside() {
    let top = 0;
    let left = 0;
    let bottom = 0;
    let right = 0;
    for (const dockControl of this.dockControls()) {
      const dockEl = dockControl.elRef.nativeElement;
      const position = dockControl.position();

      if (position === "top") {
        Object.assign(
          dockEl.style,
          {
            top: top + "px",
            bottom: "",
            left: left + "px",
            right: right + "px"
          }
        );
        top += dockEl.offsetHeight;
      }
      else if (position === "bottom") {
        Object.assign(
          dockEl.style,
          {
            top: "",
            bottom: bottom + "px",
            left: left + "px",
            right: right + "px"
          }
        );
        bottom += dockEl.offsetHeight;
      }
      else if (position === "left") {
        Object.assign(
          dockEl.style,
          {
            top: top + "px",
            bottom: bottom + "px",
            left: left + "px",
            right: ""
          }
        );
        left += dockEl.offsetWidth;
      }
      else { // right
        Object.assign(
          dockEl.style,
          {
            top: top + "px",
            bottom: bottom + "px",
            left: "",
            right: right + "px"
          }
        );
        right += dockEl.offsetWidth;
      }
    }

    Object.assign(
      this.#elRef.nativeElement.style,
      {
        paddingTop: top + "px",
        paddingBottom: bottom + "px",
        paddingRight: right + "px",
        paddingLeft: left + "px"
      }
    );
  }
}

