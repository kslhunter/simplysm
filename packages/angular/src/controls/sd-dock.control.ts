import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input
} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {SdDockContainerControl} from "./sd-dock-container.control";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorators/SdNotifyPropertyChange";
import {ResizeEvent} from "../plugins/ResizeEventPlugin";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      background: theme-color(bluegrey, darkest);

      &[position=top] {
        border-top: 1px solid get($trans-color, default);
        border-bottom: 1px solid get($trans-color, dark);
      }
      &[position=left] {
        border-right: 1px solid get($trans-color, dark);
        border-left: 1px solid get($trans-color, default);
      }
      &[position=right] {
        border-right: 1px solid get($trans-color, default);
        border-left: 1px solid get($trans-color, dark);
      }
      &[position=bottom] {
        border-top: 1px solid get($trans-color, dark);
        border-bottom: 1px solid get($trans-color, default);
      }
    }
  `]
})
export class SdDockControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["top", "right", "bottom", "left"].includes(value),
    notnull: true
  })
  @SdNotifyPropertyChange()
  @HostBinding("attr.position")
  public position: "top" | "right" | "bottom" | "left" = "top";

  @HostBinding("style.top.px")
  public top?: number;

  @HostBinding("style.right.px")
  public right?: number;

  @HostBinding("style.bottom.px")
  public bottom?: number;

  @HostBinding("style.left.px")
  public left?: number;

  public get height(): number {
    return this._elRef.nativeElement.offsetHeight;
  }

  public get width(): number {
    return this._elRef.nativeElement.offsetWidth;
  }

  public constructor(private readonly _elRef: ElementRef<HTMLElement>,
                     @Inject(forwardRef(() => SdDockContainerControl))
                     private readonly _containerControl: SdDockContainerControl) {
  }

  @HostListener("resize", ["$event"])
  public onResize(event: ResizeEvent): void {
    if (["top", "bottom"].includes(this.position) && event.dimensions.includes("height")) {
      this._containerControl.redraw();
    }
    else if (["left", "right"].includes(this.position) && event.dimensions.includes("width")) {
      this._containerControl.redraw();
    }
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "position") {
      this._containerControl.redraw();
    }
  }
}