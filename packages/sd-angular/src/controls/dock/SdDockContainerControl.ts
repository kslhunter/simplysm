import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  inject,
  Injector,
  QueryList
} from "@angular/core";
import {SdDockControl} from "./SdDockControl";
import {SdNgHelper} from "../../utils/SdNgHelper";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class SdDockContainerControl implements DoCheck {
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);
  #sdNgHelper = new SdNgHelper(inject(Injector));

  @ContentChildren(SdDockControl)
  dockControls!: QueryList<SdDockControl>;

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(run => {
      run({
        dockControls: [this.dockControls, "one"]
      }, () => {
        this.redrawOutside();
      });
    });
  }

  redrawOutside() {
    this.#sdNgHelper.runOutsideOnce("redraw", () => {
      let top = 0;
      let left = 0;
      let bottom = 0;
      let right = 0;
      for (const dockControl of this.dockControls.toArray()) {
        const dockEl = dockControl.elRef.nativeElement;
        const position = dockControl.position;

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
    });
  }
}

// V11 LOGIC OK