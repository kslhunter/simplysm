import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  forwardRef,
  HostBinding,
  QueryList
} from "@angular/core";
import {SdDockControl} from "./sd-dock.control";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
  `]
})
export class SdDockContainerControl implements AfterContentInit {
  @ContentChildren(forwardRef(() => SdDockControl))
  public dockControls?: QueryList<SdDockControl>;

  @HostBinding("style.padding-top.px")
  public paddingTop?: number;

  @HostBinding("style.padding-right.px")
  public paddingRight?: number;

  @HostBinding("style.padding-bottom.px")
  public paddingBottom?: number;

  @HostBinding("style.padding-left.px")
  public paddingLeft?: number;

  public ngAfterContentInit(): void {
    this.redraw();
  }

  public redraw(): void {
    if (!this.dockControls) return;

    let top = 0;
    let left = 0;
    let bottom = 0;
    let right = 0;
    for (const dockControl of this.dockControls.toArray()) {
      if (dockControl.position === "top") {
        dockControl.top = top;
        dockControl.bottom = undefined;
        dockControl.left = left;
        dockControl.right = right;
        top += dockControl.height;
      }
      else if (dockControl.position === "bottom") {
        dockControl.top = undefined;
        dockControl.bottom = bottom;
        dockControl.left = left;
        dockControl.right = right;
        bottom += dockControl.height;
      }
      else if (dockControl.position === "left") {
        dockControl.top = top;
        dockControl.bottom = bottom;
        dockControl.left = left;
        dockControl.right = undefined;
        left += dockControl.width;
      }
      else if (dockControl.position === "right") {
        dockControl.top = top;
        dockControl.bottom = bottom;
        dockControl.left = undefined;
        dockControl.right = right;
        right += dockControl.width;
      }
    }

    this.paddingTop = top;
    this.paddingBottom = bottom;
    this.paddingRight = right;
    this.paddingLeft = left;
  }
}
