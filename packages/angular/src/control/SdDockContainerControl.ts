import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  Injector,
  QueryList
} from "@angular/core";
import {SdDockControl} from "./SdDockControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdDockContainerControl extends SdControlBase implements AfterContentInit {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: auto;
      }`;
  }

  @ContentChildren(forwardRef(() => SdDockControl))
  public dockControls?: QueryList<SdDockControl>;

  public constructor(injector: Injector,
                     private readonly _elRef: ElementRef<HTMLElement>) {
    super(injector);
  }

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
      } else if (position === "bottom") {
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
      } else if (position === "left") {
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
      } else if (position === "right") {
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
      this._elRef.nativeElement.style,
      {
        paddingTop: top + "px",
        paddingBottom: bottom + "px",
        paddingRight: right + "px",
        paddingLeft: left + "px"
      }
    );
  }
}
