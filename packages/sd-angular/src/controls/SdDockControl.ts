import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  ViewEncapsulation,
} from "@angular/core";
import { SdSystemConfigProvider } from "../providers/SdSystemConfigProvider";
import { coercionBoolean } from "../utils/commons";
import { ISdResizeEvent } from "../plugins/SdResizeEventPlugin";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { sdCheck } from "../utils/hooks";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <ng-content></ng-content>
    @if (resizable) {
      <div class="_resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event)"></div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      sd-dock {
        display: block;
        position: absolute;
        overflow: visible;

        &[sd-resizable="true"] {
          > ._resize-bar {
            position: absolute;
            background: var(--border-color-light);
          }

          &[sd-position="top"] {
            > ._resize-bar {
              bottom: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[sd-position="bottom"] {
            > ._resize-bar {
              top: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[sd-position="left"] {
            > ._resize-bar {
              top: 0;
              right: 0;
              height: 100%;
              width: 2px;
              cursor: ew-resize;
            }
          }

          &[sd-position="right"] {
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
    `,
  ],
  host: {
    "[attr.sd-position]": "position",
    "[attr.sd-resizable]": "resizable",
  },
})
export class SdDockControl {
  #sdSystemConfig = inject(SdSystemConfigProvider);
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() key?: string;
  @Input() position: "top" | "right" | "bottom" | "left" = "top";
  @Input({ transform: coercionBoolean }) resizable = false;

  size = 0;

  #config?: { size?: string };

  constructor() {
    sdCheck(
      () => ({
        key: [this.key],
      }),
      async () => {
        this.#config = await this.#sdSystemConfig.getAsync(`sd-dock.${this.key}`);
      },
    );

    sdCheck.outside(
      () => ({
        resizable: [this.resizable],
        config: [this.#config],
      }),
      () => {
        if (this.resizable && this.#config && this.#config.size != null) {
          if (["right", "left"].includes(this.position)) {
            this.#elRef.nativeElement.style.width = this.#config.size;
          }
          if (["top", "bottom"].includes(this.position)) {
            this.#elRef.nativeElement.style.height = this.#config.size;
          }
        }
      },
    );
  }

  assignStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this.#elRef.nativeElement.style, style);
  }

  @HostListener("sdResize.outside", ["$event"])
  onResizeOutside(event: ISdResizeEvent) {
    if (["top", "bottom"].includes(this.position) && event.heightChanged) {
      this.size = this.#elRef.nativeElement.offsetHeight;
    }
    if (["right", "left"].includes(this.position) && event.widthChanged) {
      this.size = this.#elRef.nativeElement.offsetWidth;
    }
  }

  onResizeBarMousedownOutside(event: MouseEvent) {
    const thisEl = this.#elRef.nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = thisEl.clientHeight;
    const startWidth = thisEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (this.position === "bottom") {
        thisEl.style.height = `${startHeight - e.clientY + startY}px`;
      } else if (this.position === "right") {
        thisEl.style.width = `${startWidth - e.clientX + startX}px`;
      } else if (this.position === "top") {
        thisEl.style.height = `${startHeight + e.clientY - startY}px`;
      } else {
        // left
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
        } else {
          this.#config.size = thisEl.style.height;
        }
        await this.#sdSystemConfig.setAsync(`sd-dock.${this.key}`, this.#config);
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }
}
