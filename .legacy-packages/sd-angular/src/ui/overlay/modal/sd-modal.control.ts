import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdEventsDirective } from "../../../core/directives/sd-events.directive";
import { type ISdResizeEvent } from "../../../core/plugins/events/sd-resize-event.plugin";
import { SdSystemConfigProvider } from "../../../core/providers/app/sd-system-config.provider";
import { $effect } from "../../../core/utils/bindings/$effect";
import { $signal } from "../../../core/utils/bindings/$signal";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { NumberUtils } from "@simplysm/sd-core-common";
import { NgTemplateOutlet } from "@angular/common";
import { SdAnchorControl } from "../../form/button/sd-anchor.control";
import { SdActivatedModalProvider } from "./sd-modal.provider";
import { NgIcon } from "@ng-icons/core";
import { tablerX } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective, NgTemplateOutlet, SdAnchorControl, NgIcon],
  host: {
    "[attr.data-sd-open]": "open()",
    "[attr.data-sd-float]": "float()",
    "[attr.data-sd-position]": "position()",
    "[attr.data-sd-fill]": "fill()",
    "(sdResize)": "onHostResize($event)",
    "(window:resize)": "onWindowResize()",
  },
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>

    <div
      #dialogEl
      class="_dialog"
      tabindex="0"
      (keydown.escape)="onDialogEscapeKeydown()"
      [style.min-width.px]="minWidthPx()"
      [style.min-height.px]="minHeightPx()"
      [style.width.px]="
        minWidthPx() && widthPx() && minWidthPx()! > widthPx()! ? minWidthPx() : widthPx()
      "
      [style.height.px]="
        minHeightPx() && heightPx() && minHeightPx()! > heightPx()! ? minHeightPx() : heightPx()
      "
      (focus)="onDialogFocus()"
      (sdResize)="onDialogResize($event)"
    >
      <div class="flex-column fill">
        @if (!hideHeader()) {
          <div
            class="_header flex-row"
            (mousedown)="onHeaderMouseDown($event)"
            [style]="headerStyle()"
          >
            <h5 class="_title flex-fill">{{ title() }}</h5>
            <ng-template [ngTemplateOutlet]="actionTplRef() ?? null" />
            @if (!hideCloseButton()) {
              <sd-anchor [theme]="'gray'" class="_close-button" (click)="onCloseButtonClick()">
                <ng-icon [svg]="tablerX" />
              </sd-anchor>
            }
          </div>
        }

        <div class="_content flex-fill">
          <ng-content></ng-content>
        </div>
      </div>

      @if (resizable()) {
        <div class="_left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'left')"></div>
        <div class="_right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'right')"></div>
        <div class="_top-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top')"></div>
        <div
          class="_top-right-resize-bar"
          (mousedown)="onResizeBarMousedown($event, 'top-right')"
        ></div>
        <div
          class="_top-left-resize-bar"
          (mousedown)="onResizeBarMousedown($event, 'top-left')"
        ></div>
        <div class="_bottom-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom')"></div>
        <div
          class="_bottom-right-resize-bar"
          (mousedown)="onResizeBarMousedown($event, 'bottom-right')"
        ></div>
        <div
          class="_bottom-left-resize-bar"
          (mousedown)="onResizeBarMousedown($event, 'bottom-left')"
        ></div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-modal {
        display: block;
        position: fixed;
        z-index: var(--z-index-modal);
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding-top: calc(var(--topbar-height) + var(--gap-sm));

        > ._backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          //backdrop-filter: blur(2px);
          //background: color-mix(in srgb, var(--background-rev-color) 20%, transparent);
          background: var(--trans-default);
        }

        > ._dialog {
          position: relative;
          display: block;
          margin: 0 auto;
          width: fit-content;
          min-width: 200px;
          background: var(--control-color);
          overflow: hidden;
          @include mixins.elevation(16);

          border-radius: var(--border-radius-default);

          &:focus {
            outline: none;
          }

          > .flex-column {
            > ._header {
              user-select: none;
              border-bottom: 1px solid var(--theme-gray-lightest);

              > ._title {
                padding: var(--gap-sm) var(--gap-default);
              }

              > ._close-button {
                padding: var(--gap-sm) var(--gap-default);
              }
            }
          }

          > ._left-resize-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: var(--gap-sm);
            height: 100%;
            cursor: ew-resize;
          }

          > ._right-resize-bar {
            position: absolute;
            top: 0;
            right: 0;
            width: var(--gap-sm);
            height: 100%;
            cursor: ew-resize;
          }

          > ._top-resize-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: var(--gap-sm);
            cursor: ns-resize;
          }

          > ._top-right-resize-bar {
            position: absolute;
            right: 0;
            top: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            z-index: 1;
            cursor: nesw-resize;
          }

          > ._top-left-resize-bar {
            position: absolute;
            left: 0;
            top: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            cursor: nwse-resize;
            z-index: 1;
          }

          > ._bottom-resize-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: var(--gap-sm);
            cursor: ns-resize;
          }

          > ._bottom-right-resize-bar {
            position: absolute;
            right: 0;
            bottom: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            z-index: 1;
            cursor: nwse-resize;
          }

          > ._bottom-left-resize-bar {
            position: absolute;
            left: 0;
            bottom: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            cursor: nesw-resize;
            z-index: 1;
          }
        }

        opacity: 0;
        transition: opacity var(--animation-duration) ease-in-out;
        pointer-events: none;

        > ._dialog {
          transform: translateY(-25px);
          transition: transform var(--animation-duration) ease-in-out;
        }

        &[data-sd-open="true"][data-sd-init="true"] {
          opacity: 1;
          pointer-events: auto;

          > ._dialog {
            transform: none;
          }
        }

        &[data-sd-float="true"] {
          pointer-events: none;

          > ._backdrop {
            display: none;
          }

          > ._dialog {
            pointer-events: auto;
            opacity: 0;
            @include mixins.elevation(4);
            border: 1px solid var(--theme-gray-lighter);

            &:focus {
              @include mixins.elevation(16);
            }
          }

          &[data-sd-open="true"][data-sd-init="true"] {
            pointer-events: none;

            > ._dialog {
              pointer-events: auto;
              opacity: 1;
            }
          }
        }

        &[data-sd-position="bottom-right"] {
          > ._dialog {
            position: absolute;
            right: calc(var(--gap-xxl) * 2);
            bottom: var(--gap-xxl);
          }
        }

        &[data-sd-position="top-right"] {
          > ._dialog {
            position: absolute;
            right: var(--gap-xxl);
            top: var(--gap-xxl);
          }
        }

        &[data-sd-fill="true"] {
          padding-top: 0;

          > ._dialog {
            width: 100%;
            height: 100%;

            border: none;
            border-radius: 0;

            > .flex-column > ._header {
              background: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }
      }
    `,
  ],
})
export class SdModalControl {
  private readonly _sdSystemConfig = inject(SdSystemConfigProvider);
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider);

  private readonly _elRef = injectElementRef<HTMLElement>();

  open = model(false);

  key = input<string>();
  title = input.required<string>();
  hideHeader = input(false, { transform: transformBoolean });
  hideCloseButton = input(false, { transform: transformBoolean });
  useCloseByBackdrop = input(false, { transform: transformBoolean });
  useCloseByEscapeKey = input(false, { transform: transformBoolean });
  resizable = input(false, { transform: transformBoolean });
  movable = input(true, { transform: transformBoolean });
  float = input(false, { transform: transformBoolean });
  fill = input(false, { transform: transformBoolean });

  actionTplRef = input<TemplateRef<any>>();

  heightPx = input<number>();
  widthPx = input<number>();
  minHeightPx = input<number>();
  minWidthPx = input<number>();
  position = input<"bottom-right" | "top-right">();

  headerStyle = input<string>();

  dialogElRef = viewChild.required<any, ElementRef<HTMLElement>>("dialogEl", { read: ElementRef });
  // dialogContentElRef = viewChild.required<any, ElementRef<HTMLElement>>("dialogContentEl", { read: ElementRef });

  private readonly _config = $signal<ISdModalConfig>();

  constructor() {
    $effect([this.key], async () => {
      this._config.set(await this._sdSystemConfig.getAsync(`sd-modal.${this.key()}`));
    });

    $effect(() => {
      const conf = this._config();
      if (conf) {
        this.dialogElRef().nativeElement.style.position = conf.position;
        this.dialogElRef().nativeElement.style.left = conf.left;
        this.dialogElRef().nativeElement.style.top = conf.top;
        this.dialogElRef().nativeElement.style.right = conf.right;
        this.dialogElRef().nativeElement.style.bottom = conf.bottom;
        if (conf.width) {
          this.dialogElRef().nativeElement.style.width = conf.width;
        }
        if (conf.height) {
          this.dialogElRef().nativeElement.style.height = conf.height;
        }
      }

      this._elRef.nativeElement.setAttribute("data-sd-init", "true");
    });

    $effect(() => {
      if (this.open()) {
        this.dialogElRef().nativeElement.focus();
      }
    });
  }

  onDialogFocus() {
    const maxZIndex = document.body
      .findAll("sd-modal")
      .max((el) => Number(getComputedStyle(el).zIndex));
    if (maxZIndex !== undefined) {
      this._elRef.nativeElement.style.zIndex = (maxZIndex + 1).toString();
    }
  }

  onHostResize(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this._calcHeight();
    }
    if (event.widthChanged) {
      this._calcWidth();
    }
  }

  onDialogResize(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this._calcHeight();
    }
    if (event.widthChanged) {
      this._calcWidth();
    }
  }

  private _calcHeight() {
    const style = getComputedStyle(this._elRef.nativeElement);
    let paddingTop = style.paddingTop === "" ? 0 : (NumberUtils.parseInt(style.paddingTop) ?? 0);

    if (
      this.dialogElRef().nativeElement.offsetHeight >
      this._elRef.nativeElement.offsetHeight - paddingTop
    ) {
      this.dialogElRef().nativeElement.style.maxHeight = `100%`; // `calc(100% - ${paddingTop}px)`;
      this.dialogElRef().nativeElement.style.height = `100%`; // `calc(100% - ${paddingTop}px)`;
    }
  }

  private _calcWidth() {
    if (this.dialogElRef().nativeElement.offsetWidth > this._elRef.nativeElement.offsetWidth) {
      this.dialogElRef().nativeElement.style.maxWidth = `100%`;
      this.dialogElRef().nativeElement.style.width = `100%`;
    }
  }

  onWindowResize() {
    if (this.dialogElRef().nativeElement.offsetLeft > this._elRef.nativeElement.offsetWidth - 100) {
      this.dialogElRef().nativeElement.style.left =
        this._elRef.nativeElement.offsetWidth - 100 + "px";
    }
    if (this.dialogElRef().nativeElement.offsetTop > this._elRef.nativeElement.offsetHeight - 100) {
      this.dialogElRef().nativeElement.style.right =
        this._elRef.nativeElement.offsetHeight - 100 + "px";
    }
  }

  onCloseButtonClick() {
    if (this.hideCloseButton()) return;
    if (!this._sdActivatedModal.canDeactivefn()) return;

    this.open.set(false);
  }

  onBackdropClick() {
    if (this.hideCloseButton() || !this.useCloseByBackdrop()) return;
    if (!this._sdActivatedModal.canDeactivefn()) return;

    this.open.set(false);
  }

  onDialogEscapeKeydown() {
    if (this.hideCloseButton() || !this.useCloseByEscapeKey()) return;
    if (!this._sdActivatedModal.canDeactivefn()) return;

    this.open.set(false);
  }

  onResizeBarMousedown(
    event: MouseEvent,
    direction:
      | "left"
      | "right"
      | "top"
      | "top-left"
      | "top-right"
      | "bottom"
      | "bottom-left"
      | "bottom-right",
  ) {
    if (!this.resizable()) return;

    const dialogEl = this.dialogElRef().nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = dialogEl.clientHeight;
    const startWidth = dialogEl.clientWidth;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    let isDoDrag = false;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (direction === "top" || direction === "top-right" || direction === "top-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.top = startTop + (e.clientY - startY) + "px";
          dialogEl.style.bottom = "auto";
        }
        dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), this.minHeightPx() ?? 0)}px`;
      }
      if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
        dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, this.minHeightPx() ?? 0)}px`;
      }
      if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
        dialogEl.style.width = `${Math.max(
          startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
          this.minWidthPx() ?? 0,
        )}px`;
      }
      if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.left = startLeft + (e.clientX - startX) + "px";
        }
        dialogEl.style.width = `${Math.max(
          startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
          this.minWidthPx() ?? 0,
        )}px`;
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      if (this.key() != null && isDoDrag) {
        const newConf = {
          position: dialogEl.style.position,
          left: dialogEl.style.left,
          top: dialogEl.style.top,
          right: dialogEl.style.right,
          bottom: dialogEl.style.bottom,
          width: dialogEl.style.width,
          height: dialogEl.style.height,
        };
        this._config.set(newConf);
        await this._sdSystemConfig.setAsync(`sd-modal.${this.key()}`, newConf);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  onHeaderMouseDown(event: MouseEvent) {
    if (!this.movable()) return;

    const dialogEl = this.dialogElRef().nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    let isDoDrag = false;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      dialogEl.style.position = "absolute";
      dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
      dialogEl.style.top = `${startTop + e.clientY - startY}px`;
      dialogEl.style.right = "auto";
      dialogEl.style.bottom = "auto";

      const el = this._elRef.nativeElement;
      if (dialogEl.offsetLeft > el.offsetWidth - 100) {
        dialogEl.style.left = el.offsetWidth - 100 + "px";
      }
      if (dialogEl.offsetTop > el.offsetHeight - 100) {
        dialogEl.style.top = el.offsetHeight - 100 + "px";
      }
      if (dialogEl.offsetTop < 0) {
        dialogEl.style.top = "0";
      }
      if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
        dialogEl.style.left = -dialogEl.offsetWidth + 100 + "px";
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      if (this.key() != null && isDoDrag) {
        const newConf = {
          position: dialogEl.style.position,
          left: dialogEl.style.left,
          top: dialogEl.style.top,
          right: dialogEl.style.right,
          bottom: dialogEl.style.bottom,
          width: dialogEl.style.width,
          height: dialogEl.style.height,
        };
        this._config.set(newConf);
        await this._sdSystemConfig.setAsync(`sd-modal.${this.key()}`, newConf);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  protected readonly tablerX = tablerX;
}

export interface ISdModalConfig {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
}
