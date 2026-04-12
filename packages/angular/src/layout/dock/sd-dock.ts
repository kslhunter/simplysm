import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { injectSdSystemConfigResource } from "../../core/config/injectSdSystemConfigResource";
import type { SdResizeEvent } from "../../core/events/sd-resize-event.plugin";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-position]": "position()",
    "[attr.data-sd-resizable]": "resizable()",
    "(sdResize)": "onHostResize($any($event))",
  },
  template: `
    <ng-content></ng-content>
    @if (resizable()) {
      <div class="_resize-bar" (mousedown)="onResizeBarMousedown($event)"></div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      sd-dock {
        display: block;
        position: absolute;
        overflow: auto;

        &[data-sd-resizable="true"] {
          > ._resize-bar {
            position: absolute;
          }

          &[data-sd-position="top"] {
            > ._resize-bar {
              bottom: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[data-sd-position="bottom"] {
            > ._resize-bar {
              top: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[data-sd-position="left"] {
            > ._resize-bar {
              top: 0;
              right: 0;
              height: 100%;
              width: 2px;
              cursor: ew-resize;
            }
          }

          &[data-sd-position="right"] {
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
})
export class SdDock {
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _destroyRef = inject(DestroyRef);

  private _dragCleanup: (() => void) | undefined;

  key = input<string>();
  position = input<"top" | "bottom" | "right" | "left">("top");
  resizable = input(false, { transform: booleanAttribute });

  size = signal(0);

  private readonly _config = injectSdSystemConfigResource<{ size?: string }>({ key: this.key });

  constructor() {
    this._destroyRef.onDestroy(() => {
      this._dragCleanup?.();
    });

    effect(() => {
      const conf = this._config.value();
      if (this.resizable() && conf && conf.size != null) {
        if (["right", "left"].includes(this.position())) {
          this._elRef.nativeElement.style.width = conf.size;
        }
        if (["top", "bottom"].includes(this.position())) {
          this._elRef.nativeElement.style.height = conf.size;
        }
      }
    });
  }

  assignStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this._elRef.nativeElement.style, style);
  }

  onHostResize(event: SdResizeEvent) {
    if (["top", "bottom"].includes(this.position()) && event.heightChanged) {
      this.size.set(this._elRef.nativeElement.clientHeight);
    }
    if (["right", "left"].includes(this.position()) && event.widthChanged) {
      this.size.set(this._elRef.nativeElement.clientWidth);
    }
  }

  onResizeBarMousedown(event: MouseEvent) {
    this._dragCleanup?.();

    const thisEl = this._elRef.nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = thisEl.clientHeight;
    const startWidth = thisEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (this.position() === "bottom") {
        thisEl.style.height = `${Math.max(0, startHeight - e.clientY + startY)}px`;
      } else if (this.position() === "right") {
        thisEl.style.width = `${Math.max(0, startWidth - e.clientX + startX)}px`;
      } else if (this.position() === "top") {
        thisEl.style.height = `${Math.max(0, startHeight + e.clientY - startY)}px`;
      } else {
        // left
        thisEl.style.width = `${Math.max(0, startWidth + e.clientX - startX)}px`;
      }
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this._dragCleanup?.();

      if (this.key() != null) {
        const newConf: { size?: string } = {};
        if (["right", "left"].includes(this.position())) {
          newConf.size = thisEl.style.width;
        } else {
          newConf.size = thisEl.style.height;
        }
        this._config.set(newConf);
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);

    this._dragCleanup = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
      this._dragCleanup = undefined;
    };
  }
}
