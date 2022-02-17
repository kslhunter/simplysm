import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  HostBinding,
  Input,
  NgZone,
  QueryList
} from "@angular/core";
import { SdDockControl } from "./SdDockControl";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      overflow: hidden;
      @include container-base();

      > ._backdrop {
        display: none;
      }

      &[sd-float=true] {
        > ._backdrop {
          display: block;
          position: absolute;
          z-index: 10;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          opacity: 0;
          pointer-events: none;
        }

        &[sd-has-open-dock=true] {
          > ._backdrop {
            pointer-events: auto;
            opacity: .6;
            //transition: .1s ease-in-out;
          }

          ::ng-deep > sd-dock {
            z-index: 11;
            transform: none;
          }
        }
      }
    }
  `]
})
export class SdDockContainerControl implements AfterContentInit {
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-float")
  public float = false;

  @ContentChildren(forwardRef(() => SdDockControl))
  public dockControls?: QueryList<SdDockControl>;

  @HostBinding("attr.sd-has-open-dock")
  public get hasOpenDock(): boolean {
    return this.dockControls?.some((item) => item.open) === true;
  }

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone) {
  }

  public ngAfterContentInit(): void {
    this.redraw();
  }

  public onBackdropClick(): void {
    if (!this.dockControls) return;
    this.dockControls.forEach((item) => {
      if (item.open) {
        if (item.openChange.observers.length > 0) {
          item.openChange.emit(false);
        }
        else {
          item.open = false;
        }
      }
    });
  }

  public redraw(): void {
    this._zone.runOutsideAngular(() => {
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

      if (!this.float) {
        Object.assign(
          (this._elRef.nativeElement as HTMLElement).style,
          {
            paddingTop: top + "px",
            paddingBottom: bottom + "px",
            paddingRight: right + "px",
            paddingLeft: left + "px"
          }
        );
      }
    });
  }
}
