import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import {ResizeEvent} from "../plugin/ResizeEventPlugin";
import {SdLocalStorageProvider} from "../provider/SdLocalStorageProvider";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hr *ngIf="!!id" (mousedown)="onResizerMousedown($event)"/>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      background: white;
      overflow: auto;
      z-index: 1;

      &[sd-position=top] {
        border-bottom: 1px solid get($trans-color, default);
      }

      &[sd-position=bottom] {
        border-top: 1px solid get($trans-color, default);
      }
      &[sd-position=left] {
        border-right: 1px solid get($trans-color, default);
      }
      &[sd-position=right] {
        border-left: 1px solid get($trans-color, default);
      }

      > hr {
        display: none;
      }

      &[sd-resizable=true] {
        > hr {
          display: block;
          position: absolute;
          width: 4px;
          height: 4px;
          background: trans-color(default);
          margin: 0;
          padding: 0;
          border: none;
          z-index: 1;
        }

        &[sd-position=top] {
          padding-bottom: 4px;

          > hr {
            bottom: 0;
            left: 0;
            width: 100%;
            cursor: ns-resize;
          }
        }

        &[sd-position=bottom] {
          padding-top: 4px;

          > hr {
            top: 0;
            left: 0;
            width: 100%;
            cursor: ns-resize;
          }
        }
        &[sd-position=left] {
          padding-right: 4px;

          > hr {
            top: 0;
            right: 0;
            height: 100%;
            cursor: ew-resize;
          }
        }
        &[sd-position=right] {
          padding-left: 4px;

          > hr {
            top: 0;
            left: 0;
            height: 100%;
            cursor: ew-resize;
          }
        }
      }
    }
  `]
})
export class SdDockControl implements ISdNotifyPropertyChange, OnDestroy, OnInit {
  @Input()
  @SdTypeValidate(String)
  public id?: string;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["top", "right", "bottom", "left"].includes(value),
    notnull: true
  })

  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-position")
  public position: "top" | "right" | "bottom" | "left" = "top";

  @HostBinding("attr.sd-resizable")
  public get resizable(): boolean {
    return !!this.id;
  }

  private _sizeConfig: { width?: number; height?: number } | undefined;
  private _isOnDragging = false;

  public constructor(public readonly elRef: ElementRef<HTMLElement>,
                     @Inject(forwardRef(() => SdDockContainerControl))
                     private readonly _containerControl: SdDockContainerControl,
                     private readonly _localStorage: SdLocalStorageProvider) {
  }

  public ngOnInit(): void {
    if (this.resizable) {
      this._sizeConfig = this._localStorage.get(`sd-dock.${this.id}.size-config`);

      if (this._sizeConfig) {
        const el = this.elRef.nativeElement;
        if (this._sizeConfig.width && (this.position === "right" || this.position === "left")) {
          el.style.width = this._sizeConfig.width + "px";
        }
        else if (this._sizeConfig.height && (this.position === "top" || this.position === "bottom")) {
          el.style.height = this._sizeConfig.height + "px";
        }
      }
    }
  }

  public ngOnDestroy(): void {
    setTimeout(() => {
      this._containerControl.redraw();
    });
  }

  @HostListener("resize", ["$event"])
  public onResize(event: ResizeEvent): void {
    if (this._isOnDragging) return;

    if (event.dimensions.includes("height") && ["top", "bottom"].includes(this.position)) {
      this._containerControl.redraw();
    }
    else if (event.dimensions.includes("width") && ["left", "right"].includes(this.position)) {
      this._containerControl.redraw();
    }
  }

  public onResizerMousedown(event: MouseEvent): void {
    const el = this.elRef.nativeElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = el.clientHeight;
    const startWidth = el.clientWidth;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this._isOnDragging = true;

      if (this.position === "bottom") {
        el.style.height = `${startHeight - e.clientY + startY}px`;
      }
      else if (this.position === "right") {
        el.style.width = `${startWidth - e.clientX + startX}px`;
      }
      else if (this.position === "top") {
        el.style.height = `${startHeight + e.clientY - startY}px`;
      }
      else if (this.position === "left") {
        el.style.width = `${startWidth + e.clientX - startX}px`;
      }
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this._isOnDragging = false;

      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

      if (this.resizable) {
        if (this.position === "right" || this.position === "left") {
          const currWidth = el.style.width ? Number(el.style.width.replace("px", "")) : undefined;
          this._sizeConfig = this._sizeConfig || {};
          this._sizeConfig.width = currWidth;
          this._saveSizeConfig();
        }
        else {
          const currHeight = el.style.height ? Number(el.style.height.replace("px", "")) : undefined;
          this._sizeConfig = this._sizeConfig || {};
          this._sizeConfig.height = currHeight;
          this._saveSizeConfig();
        }
      }

      this._containerControl.redraw();
    };
    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "position") {
      this._containerControl.redraw();
    }
  }

  private _saveSizeConfig(): void {
    this._localStorage.set(`sd-dock.${this.id}.size-config`, this._sizeConfig);
  }
}