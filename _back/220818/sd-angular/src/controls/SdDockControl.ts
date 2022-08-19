import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  NgZone
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdDockContainerControl } from "./SdDockContainerControl";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: absolute;
    }
  `]
})
export class SdDockControl implements AfterViewInit {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["top", "right", "bottom", "left"],
    notnull: true
  })
  @HostBinding("attr.sd-position")
  public position: "top" | "right" | "bottom" | "left" = "top";

  public constructor(@Inject(SdDockContainerControl)
                     private readonly _parentContainerControl: SdDockContainerControl,
                     private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _zone: NgZone) {
  }

  public ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      this._elRef.nativeElement.addEventListener("resize", (event) => {
        if (event.prevHeight !== event.newHeight && ["top", "bottom"].includes(this.position)) {
          this._parentContainerControl.redraw();
        }
        else if (event.prevWidth !== event.newWidth && ["left", "right"].includes(this.position)) {
          this._parentContainerControl.redraw();
        }
      });
    });
    this._parentContainerControl.redraw();
  }
}
