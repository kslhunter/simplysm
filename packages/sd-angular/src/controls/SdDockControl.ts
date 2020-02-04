import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit
} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdSystemConfigProvider} from "../providers/SdSystemConfigProvider";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_resize-bar" *ngIf="resizable" (mousedown)="onResizeBarMousedown($event)"></div>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    $resize-bar-width: 4px;

    :host {
      display: block;
      position: absolute;
      overflow: auto;

      &[sd-resizable=true] {
        > ._resize-bar {
          position: absolute;
          background: var(--sd-border-color);
        }

        &[sd-position=top] {
          padding-bottom: $resize-bar-width;

          > ._resize-bar {
            bottom: 0;
            left: 0;
            width: 100%;
            height: $resize-bar-width;
            cursor: ns-resize;
          }
        }

        &[sd-position=bottom] {
          padding-top: $resize-bar-width;

          > ._resize-bar {
            top: 0;
            left: 0;
            width: 100%;
            height: $resize-bar-width;
            cursor: ns-resize;
          }
        }

        &[sd-position=left] {
          padding-right: $resize-bar-width;

          > ._resize-bar {
            top: 0;
            right: 0;
            height: 100%;
            width: $resize-bar-width;
            cursor: ew-resize;
          }
        }

        &[sd-position=right] {
          padding-left: $resize-bar-width;

          > ._resize-bar {
            top: 0;
            left: 0;
            height: 100%;
            width: $resize-bar-width;
            cursor: ew-resize;
          }
        }
      }
    }
  `]
})
export class SdDockControl implements OnDestroy, OnInit {
  @Input()
  @SdInputValidate(String)
  public configKey?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["top", "right", "bottom", "left"],
    notnull: true
  })
  @HostBinding("attr.sd-position")
  public position: "top" | "right" | "bottom" | "left" = "top";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-resizable")
  public resizable?: boolean;

  private _config?: { size?: string };

  public constructor(public readonly elRef: ElementRef<HTMLElement>,
                     @Inject(forwardRef(() => SdDockContainerControl))
                     private readonly _parentControl: SdDockContainerControl,
                     private readonly _systemConfig: SdSystemConfigProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _zone: NgZone) {
    this._zone.runOutsideAngular(() => {
      this.elRef.nativeElement.addEventListener("resize", (event) => {
        if (event.prevHeight !== event.newHeight && ["top", "bottom"].includes(this.position)) {
          this._parentControl.redraw();
        }
        else if (event.prevWidth !== event.newWidth && ["left", "right"].includes(this.position)) {
          this._parentControl.redraw();
        }
      });
    });
  }

  public async ngOnInit(): Promise<void> {
    if (this.configKey) {
      this._config = await this._systemConfig.get(`sd-dock.${this.configKey}`);
    }

    if (this.resizable && this._config && this._config.size) {
      if (["right", "left"].includes(this.position)) {
        this.elRef.nativeElement.style.width = this._config.size;
      }
      if (["top", "bottom"].includes(this.position)) {
        this.elRef.nativeElement.style.height = this._config.size;
      }
    }

    this._cdr.markForCheck();
  }

  public ngOnDestroy(): void {
    this._parentControl.redraw();
  }

  public onResizeBarMousedown(event: MouseEvent): void {
    const thisEl = this.elRef.nativeElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = thisEl.clientHeight;
    const startWidth = thisEl.clientWidth;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (this.position === "bottom") {
        thisEl.style.height = `${startHeight - e.clientY + startY}px`;
      }
      else if (this.position === "right") {
        thisEl.style.width = `${startWidth - e.clientX + startX}px`;
      }
      else if (this.position === "top") {
        thisEl.style.height = `${startHeight + e.clientY - startY}px`;
      }
      else if (this.position === "left") {
        thisEl.style.width = `${startWidth + e.clientX - startX}px`;
      }
    };

    const stopDrag = async (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

      if (this.configKey) {
        this._config = this._config || {};

        if (["right", "left"].includes(this.position)) {
          this._config.size = thisEl.style.width;
          await this._systemConfig.set(`sd-dock.${this.configKey}`, this._config);
        }
        else {
          this._config.size = thisEl.style.height;
          await this._systemConfig.set(`sd-dock.${this.configKey}`, this._config);
        }
      }
    };

    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
  }
}