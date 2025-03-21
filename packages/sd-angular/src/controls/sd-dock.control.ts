import { ChangeDetectionStrategy, Component, HostListener, inject, input, ViewEncapsulation } from "@angular/core";
import { SdSystemConfigProvider } from "../providers/sd-system-config.provider";
import { ISdResizeEvent } from "../plugins/events/sd-resize.event-plugin";
import { $effect, $signal } from "../utils/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-dock {
        display: block;
        position: absolute;
        overflow: auto;

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
  template: `
    <ng-content></ng-content>
    @if (resizable()) {
      <div class="_resize-bar" (mousedown)="onResizeBarMousedown($event)"></div>
    }
  `,
  host: {
    "[attr.sd-position]": "position()",
    "[attr.sd-resizable]": "resizable()",
  },
})
export class SdDockControl {
  #sdSystemConfig = inject(SdSystemConfigProvider);
  #elRef = injectElementRef<HTMLElement>();

  key = input<string>();
  position = input<"top" | "bottom" | "right" | "left">("top");
  resizable = input(false, { transform: transformBoolean });

  size = $signal(0);

  #config = $signal<{ size?: string }>();

  constructor() {
    $effect([this.key], async () => {
      this.#config.set(await this.#sdSystemConfig.getAsync(`sd-dock.${this.key()}`));
    });

    $effect(() => {
      const conf = this.#config();
      if (this.resizable() && conf && conf.size != null) {
        if (["right", "left"].includes(this.position())) {
          this.#elRef.nativeElement.style.width = conf.size;
        }
        if (["top", "bottom"].includes(this.position())) {
          this.#elRef.nativeElement.style.height = conf.size;
        }
      }
    });
  }

  assignStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this.#elRef.nativeElement.style, style);
  }

  @HostListener("sdResize", ["$event"])
  onResize(event: ISdResizeEvent) {
    if (["top", "bottom"].includes(this.position()) && event.heightChanged) {
      this.size.set(this.#elRef.nativeElement.offsetHeight);
    }
    if (["right", "left"].includes(this.position()) && event.widthChanged) {
      this.size.set(this.#elRef.nativeElement.offsetWidth);
    }
  }

  onResizeBarMousedown(event: MouseEvent) {
    const thisEl = this.#elRef.nativeElement;

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
      else {
        // left
        thisEl.style.width = `${startWidth + e.clientX - startX}px`;
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);

      if (this.key() != null) {
        const newConf: { size?: string } = {};
        if (["right", "left"].includes(this.position())) {
          newConf.size = thisEl.style.width;
        }
        else {
          newConf.size = thisEl.style.height;
        }
        this.#config.set(newConf);
        await this.#sdSystemConfig.setAsync(`sd-dock.${this.key()}`, newConf);
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }
}
