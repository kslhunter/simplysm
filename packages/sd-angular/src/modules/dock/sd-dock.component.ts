import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { SdDockContainerComponent } from "./sd-dock-container.component";
import { SdSystemConfigService } from "../../services/system-config";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <ng-content></ng-content>
      <div class="_resize-bar" *ngIf="resizable" (mousedown)="onResizeBarMousedown($event)"></div>
    </div>`,
  styles: [/* language=SCSS */ `
    $resize-bar-width: 4px;

    :host {
      display: block;
      position: absolute;
      overflow: auto;

      &[sd-float=true] {
        display: block;
        transition: .1s ease-in-out;
        opacity: 0;

        &[sd-position=top] {
          transform: translateY(-100%);
        }

        &[sd-position=bottom] {
          transform: translateY(100%);
        }

        &[sd-position=left] {
          transform: translateX(-100%);
        }

        &[sd-position=right] {
          transform: translateX(100%);
        }

        &[sd-open=true] {
          display: block;
          opacity: 1;
          transform: none;
        }
      }

      > div {
        height: 100%;
      }

      &[sd-resizable=true] {
        > div {
          > ._resize-bar {
            position: absolute;
            background: var(--sd-border-color);
          }
        }

        &[sd-position=top] {
          > div {
            padding-bottom: $resize-bar-width;

            > ._resize-bar {
              bottom: 0;
              left: 0;
              width: 100%;
              height: $resize-bar-width;
              cursor: ns-resize;
            }
          }
        }

        &[sd-position=bottom] {
          > div {
            padding-top: $resize-bar-width;

            > ._resize-bar {
              top: 0;
              left: 0;
              width: 100%;
              height: $resize-bar-width;
              cursor: ns-resize;
            }
          }
        }

        &[sd-position=left] {
          > div {
            padding-right: $resize-bar-width;

            > ._resize-bar {
              top: 0;
              right: 0;
              height: 100%;
              width: $resize-bar-width;
              cursor: ew-resize;
            }
          }
        }

        &[sd-position=right] {
          > div {
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

      &[sd-hide-resize-border=true] {
        > div {
          padding: 0 !important;

          > ._resize-bar {
            background: transparent;
          }
        }
      }
    }
  `]
})
export class SdDockComponent implements OnDestroy, OnInit, OnChanges {
  @Input()
  @SdInputValidate(String)
  public key?: string;

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

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-hide-resize-border")
  public hideResizeBorder?: boolean;

  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-open")
  public open = false;

  @HostBinding("attr.sd-float")
  public get float(): boolean {
    return this._parentControl.float;
  }

  @Output()
  public readonly openChange = new EventEmitter<boolean>();

  private _config?: { size?: string };

  private readonly _el: HTMLElement;

  public constructor(public readonly elRef: ElementRef,
                     @Inject(forwardRef(() => SdDockContainerComponent))
                     private readonly _parentControl: SdDockContainerComponent,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _zone: NgZone,
                     private readonly _systemConfig: SdSystemConfigService) {
    this._el = this.elRef.nativeElement;

    this._zone.runOutsideAngular(() => {
      this._el.addEventListener("resize", (event) => {
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
    if (this.key !== undefined) {
      this._config = await this._systemConfig.getAsync(`sd-dock.${this.key}`);
    }

    if (this.resizable && this._config && this._config.size !== undefined) {
      if (["right", "left"].includes(this.position)) {
        this._el.style.width = this._config.size;
      }
      if (["top", "bottom"].includes(this.position)) {
        this._el.style.height = this._config.size;
      }
    }

    this._cdr.markForCheck();
  }

  public ngOnDestroy(): void {
    this._parentControl.redraw();
  }

  public onResizeBarMousedown(event: MouseEvent): void {
    const thisEl = this._el;
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = thisEl.clientHeight;
    const startWidth = thisEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
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
      else { // left
        thisEl.style.width = `${startWidth + e.clientX - startX}px`;
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      if (this.key !== undefined) {
        this._config = this._config ?? {};

        if (["right", "left"].includes(this.position)) {
          this._config.size = thisEl.style.width;
          await this._systemConfig.setAsync(`sd-dock.${this.key}`, this._config);
        }
        else {
          this._config.size = thisEl.style.height;
          await this._systemConfig.setAsync(`sd-dock.${this.key}`, this._config);
        }
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  private _prevActiveElement: HTMLElement | undefined = undefined;

  public ngOnChanges(changes: SimpleChanges): void {
    if ("open" in changes) {
      if (this.open) {
        this._prevActiveElement = document.activeElement as HTMLElement | undefined;
        this._zone.runOutsideAngular(() => {
          setTimeout(() => {
            document.body.findFocusableFirst()?.focus();
          });
        });
      }
      else {
        this._prevActiveElement?.focus();
      }
    }
  }
}
