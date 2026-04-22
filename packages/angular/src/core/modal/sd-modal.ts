import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  ErrorHandler,
  inject,
  input,
  model,
  output,
  type TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { NgIcon } from "@ng-icons/core";
import { tablerX } from "@ng-icons/tabler-icons";
import { SdActivatedModalProvider } from "./sd-activated-modal.provider";
import { SdSystemConfigProvider } from "../config/sd-system-config.provider";
import { injectFocusTrap } from "./injectFocusTrap";
import { injectDragResize } from "./injectDragResize";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdResizeDirective, type SdResizeEvent } from "../events/sd-resize";
import "@simplysm/core-browser";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, NgIcon, SdAnchor, SdResizeDirective],
  hostDirectives: [{ directive: SdResizeDirective, outputs: ["sdResize"] }],
  host: {
    "[attr.data-sd-open]": "open() || undefined",
    "[attr.data-sd-float]": "float() || undefined",
    "[attr.data-sd-fill]": "fill() || undefined",
    "[attr.data-sd-position]": "position() || undefined",
    "(sdResize)": "onHostResize($event)",
    "(window:resize)": "onWindowResize()",
  },
  template: `
    <div
      class="_backdrop"
      tabindex="-1"
      role="button"
      (click)="onBackdropClick()"
      (keydown.enter)="onBackdropClick()"
    ></div>
    <div
      class="_dialog"
      tabindex="-1"
      (keydown)="onDialogKeydown($event)"
      (focus)="onDialogFocus()"
      (sdResize)="onDialogResize($event)"
    >
      @if (!hideHeader()) {
        <div class="_header" (mousedown)="onHeaderMouseDown($event)" [style]="headerStyle()">
          <h5 class="_title">{{ title() }}</h5>
          @if (actionTplRef()) {
            <ng-container *ngTemplateOutlet="actionTplRef()!" />
          }
          @if (!hideCloseButton()) {
            <sd-anchor [theme]="'gray'" class="_close-btn" (click)="onCloseButtonClick()">
              <ng-icon [svg]="tablerX" />
            </sd-anchor>
          }
        </div>
      }
      <div class="_content"><ng-content /></div>
      @if (resizable()) {
        <div
          class="_resize-handle _resize-top"
          data-resize-dir="top"
          (mousedown)="onResizeMouseDown($event, 'top')"
        ></div>
        <div
          class="_resize-handle _resize-bottom"
          data-resize-dir="bottom"
          (mousedown)="onResizeMouseDown($event, 'bottom')"
        ></div>
        <div
          class="_resize-handle _resize-left"
          data-resize-dir="left"
          (mousedown)="onResizeMouseDown($event, 'left')"
        ></div>
        <div
          class="_resize-handle _resize-right"
          data-resize-dir="right"
          (mousedown)="onResizeMouseDown($event, 'right')"
        ></div>
        <div
          class="_resize-handle _resize-top-left"
          data-resize-dir="top-left"
          (mousedown)="onResizeMouseDown($event, 'top-left')"
        ></div>
        <div
          class="_resize-handle _resize-top-right"
          data-resize-dir="top-right"
          (mousedown)="onResizeMouseDown($event, 'top-right')"
        ></div>
        <div
          class="_resize-handle _resize-bottom-left"
          data-resize-dir="bottom-left"
          (mousedown)="onResizeMouseDown($event, 'bottom-left')"
        ></div>
        <div
          class="_resize-handle _resize-bottom-right"
          data-resize-dir="bottom-right"
          (mousedown)="onResizeMouseDown($event, 'bottom-right')"
        ></div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-modal {
        display: block;
        position: fixed;
        z-index: var(--z-index-modal);
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding-top: calc(var(--topbar-height) + var(--gap-sm));
        opacity: 0;
        transition: opacity var(--animation-duration) ease-in-out;
        pointer-events: none;

        > ._backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--trans-default);
        }

        > ._dialog {
          position: relative;
          display: flex;
          flex-direction: column;
          margin: 0 auto;
          width: fit-content;
          min-width: 200px;
          background: var(--control-color);
          overflow: hidden;
          @include mixins.elevation(16);
          border-radius: var(--border-radius-default);
          transform: translateY(-25px);
          transition: transform var(--animation-duration) ease-in-out;

          &:focus {
            outline: none;
          }

          > ._header {
            display: flex;
            align-items: center;
            user-select: none;
            border-bottom: 1px solid var(--theme-gray-lightest);

            > ._title {
              flex: 1;
              padding: var(--gap-sm) var(--gap-default);
            }

            > ._close-btn {
              padding: var(--gap-sm) var(--gap-default);
            }
          }

          > ._content {
            flex: 1;
            overflow: auto;
          }

          > ._resize-handle {
            position: absolute;

            &._resize-left {
              top: 0;
              left: 0;
              width: var(--gap-sm);
              height: 100%;
              cursor: ew-resize;
            }

            &._resize-right {
              top: 0;
              right: 0;
              width: var(--gap-sm);
              height: 100%;
              cursor: ew-resize;
            }

            &._resize-top {
              top: 0;
              left: 0;
              width: 100%;
              height: var(--gap-sm);
              cursor: ns-resize;
            }

            &._resize-top-right {
              right: 0;
              top: 0;
              width: var(--gap-sm);
              height: var(--gap-sm);
              z-index: 1;
              cursor: nesw-resize;
            }

            &._resize-top-left {
              left: 0;
              top: 0;
              width: var(--gap-sm);
              height: var(--gap-sm);
              cursor: nwse-resize;
              z-index: 1;
            }

            &._resize-bottom {
              bottom: 0;
              left: 0;
              width: 100%;
              height: var(--gap-sm);
              cursor: ns-resize;
            }

            &._resize-bottom-right {
              right: 0;
              bottom: 0;
              width: var(--gap-sm);
              height: var(--gap-sm);
              z-index: 1;
              cursor: nwse-resize;
            }

            &._resize-bottom-left {
              left: 0;
              bottom: 0;
              width: var(--gap-sm);
              height: var(--gap-sm);
              cursor: nesw-resize;
              z-index: 1;
            }
          }
        }

        &[data-sd-open][data-sd-init] {
          opacity: 1;
          pointer-events: auto;

          > ._dialog {
            transform: none;
          }
        }

        &[data-sd-float] {
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

          &[data-sd-open][data-sd-init] {
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

        &[data-sd-fill] {
          padding-top: 0;

          > ._dialog {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;

            > ._header {
              background: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }
      }
    `,
  ],
})
export class SdModal {
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdSystemConfig = inject(SdSystemConfigProvider, { optional: true });
  private readonly _errorHandler = inject(ErrorHandler);
  private readonly _focusTrap = injectFocusTrap();

  protected readonly tablerX = tablerX;

  open = model(false);
  key = input<string | undefined>(undefined);
  title = input("");
  hideHeader = input(false);
  hideCloseButton = input(false);
  headerStyle = input<string | undefined>(undefined);
  useCloseByBackdrop = input(true);
  useCloseByEscapeKey = input(true);
  float = input(false);
  fill = input(false);
  resizable = input(false);
  movable = input(false);
  position = input<"bottom-right" | "top-right" | undefined>(undefined);
  minHeightPx = input<number | undefined>(undefined);
  minWidthPx = input<number | undefined>(undefined);
  heightPx = input<number | undefined>(undefined);
  widthPx = input<number | undefined>(undefined);
  actionTplRef = input<TemplateRef<any> | undefined>(undefined);

  closeRequest = output<void>();

  private readonly _dragResize = injectDragResize({
    getDialogEl: () => this._getDialogEl(),
    minWidthPx: this.minWidthPx,
    minHeightPx: this.minHeightPx,
    onEnd: () => void this._saveConfig().catch((err) => this._errorHandler.handleError(err)),
  });

  constructor() {
    // data-sd-init: 첫 렌더 후 설정하여 CSS transition 트리거 허용
    effect(() => {
      this._elRef.nativeElement.setAttribute("data-sd-init", "");
    });

    // widthPx/heightPx를 dialog 스타일에 적용
    effect(() => {
      const dialogEl = this._getDialogEl();
      if (dialogEl == null) return;

      const w = this.widthPx();
      const h = this.heightPx();
      if (w != null) {
        dialogEl.style.width = `${w}px`;
      } else {
        dialogEl.style.width = "";
      }
      if (h != null) {
        dialogEl.style.height = `${h}px`;
      } else {
        dialogEl.style.height = "";
      }
    });

    // key 기반 설정 복원
    effect(() => {
      const k = this.key();
      if (k == null || this._sdSystemConfig == null) return;

      void this._restoreConfig(k).catch((err) => this._errorHandler.handleError(err));
    });
  }

  onResizeMouseDown(event: MouseEvent, dir: string): void {
    event.preventDefault();
    this._dragResize.startResize(event, dir);
  }

  onHeaderMouseDown(event: MouseEvent): void {
    if (!this.movable()) return;
    if ((event.target as HTMLElement).closest("button, sd-anchor") != null) return;
    event.preventDefault();
    this._dragResize.startDrag(event);
  }

  onBackdropClick(): void {
    if (!this.useCloseByBackdrop()) return;
    this._requestClose();
  }

  onCloseButtonClick(): void {
    this._requestClose();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      if (!this.useCloseByEscapeKey()) return;
      this._requestClose();
    } else if (event.key === "Tab") {
      this._focusTrap.handleTabTrap(event);
    }
  }

  onDialogFocus(): void {
    this._bringToFront();
  }

  onHostResize(event: SdResizeEvent): void {
    if (event.heightChanged) this._calcHeight();
    if (event.widthChanged) this._calcWidth();
  }

  onDialogResize(event: SdResizeEvent): void {
    if (event.heightChanged) this._calcHeight();
    if (event.widthChanged) this._calcWidth();
  }

  onWindowResize(): void {
    const dialogEl = this._getDialogEl();
    if (dialogEl == null) return;
    const hostEl = this._elRef.nativeElement;
    if (dialogEl.offsetLeft > hostEl.offsetWidth - 100) {
      dialogEl.style.left = hostEl.offsetWidth - 100 + "px";
    }
    if (dialogEl.offsetTop > hostEl.offsetHeight - 100) {
      dialogEl.style.top = hostEl.offsetHeight - 100 + "px";
    }
  }

  private _requestClose(): void {
    if (this._sdActivatedModal != null && !this._sdActivatedModal.canDeactivateFn()) {
      return;
    }
    void this._saveConfig().catch((err) => this._errorHandler.handleError(err));
    this.closeRequest.emit();
  }

  private _bringToFront(): void {
    const hostEl = this._elRef.nativeElement;
    const allModals = document.body.findAll<HTMLElement>("sd-modal");
    let maxZ = 4000;
    for (const m of allModals) {
      if (m === hostEl) continue;
      const z = parseInt(m.style.zIndex || "0", 10);
      if (z > maxZ) {
        maxZ = z;
      }
    }
    const currentZ = parseInt(hostEl.style.zIndex !== "" ? hostEl.style.zIndex : "0", 10);
    if (currentZ >= maxZ) return;
    hostEl.style.zIndex = String(maxZ + 1);
  }

  private _calcHeight(): void {
    const dialogEl = this._getDialogEl();
    if (dialogEl == null) return;
    const style = getComputedStyle(this._elRef.nativeElement);
    const paddingTop = style.paddingTop === "" ? 0 : parseInt(style.paddingTop, 10) || 0;
    if (dialogEl.offsetHeight > this._elRef.nativeElement.offsetHeight - paddingTop) {
      dialogEl.style.maxHeight = "100%";
      dialogEl.style.height = "100%";
    }
  }

  private _calcWidth(): void {
    const dialogEl = this._getDialogEl();
    if (dialogEl == null) return;
    if (dialogEl.offsetWidth > this._elRef.nativeElement.offsetWidth) {
      dialogEl.style.maxWidth = "100%";
      dialogEl.style.width = "100%";
    }
  }

  private _getDialogEl(): HTMLElement | null {
    return this._elRef.nativeElement.querySelector("._dialog");
  }

  private async _saveConfig(): Promise<void> {
    const k = this.key();
    if (k == null || this._sdSystemConfig == null) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl == null) return;

    const config: Record<string, string> = {};
    if (dialogEl.style.width !== "") config["width"] = dialogEl.style.width;
    if (dialogEl.style.height !== "") config["height"] = dialogEl.style.height;
    if (dialogEl.style.left !== "") config["left"] = dialogEl.style.left;
    if (dialogEl.style.top !== "") config["top"] = dialogEl.style.top;

    await this._sdSystemConfig.setAsync(`sd-modal.${k}` as any, config as any);
  }

  private async _restoreConfig(k: string): Promise<void> {
    if (this._sdSystemConfig == null) return;

    const config = (await this._sdSystemConfig.getAsync(`sd-modal.${k}`)) as
      | Record<string, string | undefined>
      | undefined;
    if (config == null) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl == null) return;

    if (config["width"] != null) dialogEl.style.width = config["width"];
    if (config["height"] != null) dialogEl.style.height = config["height"];
    if (config["left"] != null) dialogEl.style.left = config["left"];
    if (config["top"] != null) dialogEl.style.top = config["top"];
  }
}
