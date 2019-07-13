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
  OnInit,
  ViewEncapsulation
} from "@angular/core";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdLocalStorageProvider} from "../local-storage/SdLocalStorageProvider";
import {ResizeEvent} from "../../commons/ResizeEvent";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_resizer" *ngIf="!!id" (mousedown)="onResizerMousedown($event)">
      <!--<hr *ngIf="!!id" (mousedown)="onResizerMousedown($event)"/>-->
    </div>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-dock {
      display: block;
      position: absolute;
      overflow: auto;
      z-index: 1;
      background: white;

      > ._resizer {
        display: none;
        user-select: none;
      }

      &[sd-border=true] {
        &[sd-position=top] {
          border-bottom: 1px solid var(--dock-border-color);
        }

        &[sd-position=bottom] {
          border-top: 1px solid var(--dock-border-color);
        }

        &[sd-position=left] {
          border-right: 1px solid var(--dock-border-color);
        }

        &[sd-position=right] {
          border-left: 1px solid var(--dock-border-color);
        }
      }

      &[sd-resizable=true] {
        > ._resizer {
          display: block;
          position: absolute;
          width: var(--dock-resizer-size);
          height: var(--dock-resizer-size);
          background: var(--theme-grey-light);
          margin: 0;
          padding: 0;
          z-index: 1;
        }

        border: none !important;

        &[sd-position=top] {
          padding-bottom: var(--dock-resizer-size);

          > ._resizer {
            bottom: 0;
            left: 0;
            width: 100%;
            cursor: ns-resize;
            border-left: none;
            border-right: none;
          }
        }

        &[sd-position=bottom] {
          padding-top: var(--dock-resizer-size);

          > ._resizer {
            top: 0;
            left: 0;
            width: 100%;
            cursor: ns-resize;
            border-left: none;
            border-right: none;
          }
        }

        &[sd-position=left] {
          padding-right: var(--dock-resizer-size);

          > ._resizer {
            top: 0;
            right: 0;
            height: 100%;
            cursor: ew-resize;
            border-top: none;
            border-bottom: none;
          }
        }

        &[sd-position=right] {
          padding-left: var(--dock-resizer-size);

          > ._resizer {
            top: 0;
            left: 0;
            height: 100%;
            cursor: ew-resize;
            border-top: none;
            border-bottom: none;
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
    includes: ["top", "right", "bottom", "left"],
    notnull: true
  })
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-position")
  public position: "top" | "right" | "bottom" | "left" = "top";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-border")
  public border?: boolean;

  @HostBinding("attr.sd-resizable")
  public get resizable(): boolean {
    return !!this.id;
  }

  private _sizeConfig: { width?: number; height?: number } | undefined;
  private _isOnDragging = false;

  public constructor(public readonly elRef: ElementRef,
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

    if (event.detail.dimensions.includes("height") && ["top", "bottom"].includes(this.position)) {
      this._containerControl.redraw();
    }
    else if (event.detail.dimensions.includes("width") && ["left", "right"].includes(this.position)) {
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
