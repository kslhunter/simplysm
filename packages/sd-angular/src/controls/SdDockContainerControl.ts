import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  inject,
  QueryList,
  ViewEncapsulation,
} from "@angular/core";
import { SdDockControl } from "./SdDockControl";
import { sdCheck } from "../utils/hooks";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content /> `,
  styles: [
    /* language=SCSS */ `
      sd-dock-container {
        display: block;
        position: relative;
        height: 100%;
      }
    `,
  ],
})
export class SdDockContainerControl {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @ContentChildren(SdDockControl) dockControls!: QueryList<SdDockControl>;

  constructor() {
    sdCheck.outside(this, [() => [this.dockControls.map((item) => `${item.position}(${item.size})`), "one"]], () => {
      let top = 0;
      let left = 0;
      let bottom = 0;
      let right = 0;
      for (const dockControl of this.dockControls.toArray()) {
        const position = dockControl.position;

        if (position === "top") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: "",
            left: left + "px",
            right: right + "px",
          });
          top += dockControl.size;
        } else if (position === "bottom") {
          dockControl.assignStyle({
            top: "",
            bottom: bottom + "px",
            left: left + "px",
            right: right + "px",
          });
          bottom += dockControl.size;
        } else if (position === "left") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: left + "px",
            right: "",
          });
          left += dockControl.size;
        } else {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: "",
            right: right + "px",
          });
          right += dockControl.size;
        }
      }

      Object.assign(this.#elRef.nativeElement.style, {
        paddingTop: top + "px",
        paddingBottom: bottom + "px",
        paddingRight: right + "px",
        paddingLeft: left + "px",
      });
    });
  }
}
