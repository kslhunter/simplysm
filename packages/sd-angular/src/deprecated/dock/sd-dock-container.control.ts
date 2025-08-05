import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { $effect } from "../../utils/bindings/$effect";
import { SdDockControl } from "./sd-dock.control";

/** @deprecated */
@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div #content [class]="['_content', contentClass()].filterExists().join(' ')">
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-dock-container {
        display: block;
        height: 100%;

        > ._content {
          position: relative;
          height: 100%;
        }
      }
    `,
  ],
})
export class SdDockContainerControl {
  dockControls = contentChildren(SdDockControl);

  contentElRef = viewChild.required<any, ElementRef<HTMLDivElement>>("content", { read: ElementRef });

  contentClass = input<string>();

  constructor() {
    $effect(() => {
      let top = 0;
      let left = 0;
      let bottom = 0;
      let right = 0;
      for (const dockControl of this.dockControls()) {
        const position = dockControl.position();
        const size = dockControl.size();

        if (position === "top") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: "",
            left: left + "px",
            right: right + "px",
          });
          top += size;
        } else if (position === "bottom") {
          dockControl.assignStyle({
            top: "",
            bottom: bottom + "px",
            left: left + "px",
            right: right + "px",
          });
          bottom += size;
        } else if (position === "left") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: left + "px",
            right: "",
          });
          left += size;
        } else {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: "",
            right: right + "px",
          });
          right += size;
        }
      }

      Object.assign(this.contentElRef().nativeElement.style, {
        paddingTop: top + "px",
        paddingBottom: bottom + "px",
        paddingRight: right + "px",
        paddingLeft: left + "px",
      });
    });
  }
}
