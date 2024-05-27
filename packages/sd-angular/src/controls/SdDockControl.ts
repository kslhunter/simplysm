import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input
} from "@angular/core";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdSystemConfigProvider} from "../providers/SdSystemConfigProvider";
import {coercionBoolean} from "../utils/commons";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";
import {NgIf} from "@angular/common";
import {SdEventsDirective} from "../directives/SdEventsDirective";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    SdEventsDirective
  ],
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
        }

        &[sd-position=top] {
          > ._resize-bar {
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            cursor: ns-resize;
          }
        }

        &[sd-position=bottom] {
          > ._resize-bar {
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            cursor: ns-resize;
          }
        }

        &[sd-position=left] {
          > ._resize-bar {
            top: 0;
            right: 0;
            height: 100%;
            width: 2px;
            cursor: ew-resize;
          }
        }

        &[sd-position=right] {
          > ._resize-bar {
            top: 0;
            left: 0;
            height: 100%;
            width: 2px;
            cursor: ew-resize;
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-position]": "position()",
    "[attr.sd-resizable]": "resizable()",
    "[attr.sd-hide-resize-border]": "hideResizeBorder()"
  }
})
export class SdDockControl {
  #parentControl: SdDockContainerControl = inject(forwardRef(() => SdDockContainerControl));
  #sdSystemConfig = inject(SdSystemConfigProvider);

  elRef: ElementRef<HTMLElement> = inject(ElementRef);

  key = input<string>();
  position = input<"top" | "right" | "bottom" | "left">("top");
  resizable = input(false, {transform: coercionBoolean});
  hideResizeBorder = input(false, {transform: coercionBoolean});

  constructor() {
    effect(async () => {
      if (this.key() != null) {
        const config = await this.#sdSystemConfig.getAsync(`sd-dock.${this.key()}`);

        if (this.resizable() && config != null && config.size != null) {
          if (["right", "left"].includes(this.position())) {
            this.elRef.nativeElement.style.width = config.size;
          }
          if (["top", "bottom"].includes(this.position())) {
            this.elRef.nativeElement.style.height = config.size;
          }
        }
      }
    });
  }

  @HostListener("sdResize.outside", ["$event"])
  onResizeOutside(event: ISdResizeEvent) {
    if (["top", "bottom"].includes(this.position()) && event.heightChanged) {
      this.#parentControl.redrawOutside();
    }
    if (["right", "left"].includes(this.position()) && event.widthChanged) {
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

      if (this.position() === "bottom") {
        thisEl.style.height = `${startHeight - e.clientY + startY}px`;
      }
      else if (this.position() === "right") {
        thisEl.style.width = `${startWidth - e.clientX + startX}px`;
      }
      else if (this.position() === "top") {
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

      if (this.key() != null) {
        if (["right", "left"].includes(this.position())) {
          await this.#sdSystemConfig.setAsync(`sd-dock.${this.key}`, {
            size: thisEl.style.width
          });
        }
        else {
          await this.#sdSystemConfig.setAsync(`sd-dock.${this.key}`, {
            size: thisEl.style.width
          });
        }
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }
}

