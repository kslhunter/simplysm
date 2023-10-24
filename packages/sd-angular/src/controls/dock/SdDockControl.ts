import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnInit
} from "@angular/core";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdSystemConfigProvider} from "../../providers/SdSystemConfigProvider";
import {coercionBoolean} from "../../utils/commons";
import {ISdResizeEvent} from "../../plugins/SdResizeEventPlugin";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_resize-bar" *ngIf="resizable" (mousedown.outside)="onResizeBarMousedownOutside($event)"></div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: absolute;
      overflow: visible;

      &[sd-resizable=true] {
        > ._resize-bar {
          position: absolute;
          background: var(--border-color-light);
        }

        &[sd-position=top] {
          padding-bottom: 2px;

          > ._resize-bar {
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            cursor: ns-resize;
          }
        }

        &[sd-position=bottom] {
          padding-top: 2px;

          > ._resize-bar {
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            cursor: ns-resize;
          }
        }

        &[sd-position=left] {
          padding-right: 2px;

          > ._resize-bar {
            top: 0;
            right: 0;
            height: 100%;
            width: 2px;
            cursor: ew-resize;
          }
        }

        &[sd-position=right] {
          padding-left: 2px;

          > ._resize-bar {
            top: 0;
            left: 0;
            height: 100%;
            width: 2px;
            cursor: ew-resize;
          }
        }
      }

      &[sd-hide-resize-border=true] {
        padding: 0 !important;

        > ._resize-bar {
          background: transparent;
        }
      }
    }
  `]
})
export class SdDockControl implements OnInit {
  elRef: ElementRef<HTMLElement> = inject(ElementRef);
  #parentControl: SdDockContainerControl = inject(forwardRef(() => SdDockContainerControl));
  #cdr = inject(ChangeDetectorRef);
  #sdSystemConfig = inject(SdSystemConfigProvider);

  @Input()
  key?: string;

  @Input()
  @HostBinding("attr.sd-position")
  position: "top" | "right" | "bottom" | "left" = "top";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-resizable")
  resizable = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-hide-resize-border")
  hideResizeBorder = false;

  #config?: { size?: string };

  async ngOnInit() {
    if (this.key != null) {
      this.#config = await this.#sdSystemConfig.getAsync(`sd-dock.${this.key}`);


      if (this.resizable && this.#config && this.#config.size !== undefined) {
        if (["right", "left"].includes(this.position)) {
          this.elRef.nativeElement.style.width = this.#config.size;
        }
        if (["top", "bottom"].includes(this.position)) {
          this.elRef.nativeElement.style.height = this.#config.size;
        }
      }

      this.#cdr.markForCheck();
    }
  }

  @HostListener("sdResize.outside", ["$event"])
  onResizeOutside(event: ISdResizeEvent) {
    if (["top", "bottom"].includes(this.position) && event.heightChanged) {
      this.#parentControl.redrawOutside();
    }
    if (["right", "left"].includes(this.position) && event.widthChanged) {
      this.#parentControl.redrawOutside();
    }
  }

  onResizeBarMousedownOutside(event: MouseEvent) {
    const thisEl = this.elRef.nativeElement;

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

      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);

      if (this.key != null) {
        this.#config = this.#config ?? {};

        if (["right", "left"].includes(this.position)) {
          this.#config.size = thisEl.style.width;
          await this.#sdSystemConfig.setAsync(`sd-dock.${this.key}`, this.#config);
        }
        else {
          this.#config.size = thisEl.style.height;
          await this.#sdSystemConfig.setAsync(`sd-dock.${this.key}`, this.#config);
        }
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }
}

// V11 LOGIC OK