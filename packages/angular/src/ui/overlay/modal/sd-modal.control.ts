import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  type TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { isTabbable } from "tabbable";
import { NgTemplateOutlet } from "@angular/common";
import { SdActivatedModalProvider } from "./sd-modal.provider";
import { SdSystemConfigProvider } from "../../../core/providers/sd-system-config.provider";
import "@simplysm/core-browser";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet],
  host: {
    "[attr.data-sd-open]": "open() || undefined",
    "[attr.data-sd-float]": "float() || undefined",
    "[attr.data-sd-fill]": "fill() || undefined",
    "[attr.data-sd-position]": "position() || undefined",
  },
  template: `
    <div class="_backdrop" (mousedown)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="-1"
         (keydown)="onDialogKeydown($event)"
         (focus)="onDialogFocus()">
      @if (!hideHeader()) {
        <div class="_header" (mousedown)="onHeaderMouseDown($event)">
          <span class="_title">{{ title() }}</span>
          @if (actionTplRef()) {
            <ng-container *ngTemplateOutlet="actionTplRef()!" />
          }
          @if (!hideCloseButton()) {
            <button class="_close-btn" (click)="onCloseButtonClick()">×</button>
          }
        </div>
      }
      <div class="_content"><ng-content /></div>
      @if (resizable()) {
        <div class="_resize-handle _resize-top" data-resize-dir="top" (mousedown)="onResizeMouseDown($event, 'top')"></div>
        <div class="_resize-handle _resize-bottom" data-resize-dir="bottom" (mousedown)="onResizeMouseDown($event, 'bottom')"></div>
        <div class="_resize-handle _resize-left" data-resize-dir="left" (mousedown)="onResizeMouseDown($event, 'left')"></div>
        <div class="_resize-handle _resize-right" data-resize-dir="right" (mousedown)="onResizeMouseDown($event, 'right')"></div>
        <div class="_resize-handle _resize-top-left" data-resize-dir="top-left" (mousedown)="onResizeMouseDown($event, 'top-left')"></div>
        <div class="_resize-handle _resize-top-right" data-resize-dir="top-right" (mousedown)="onResizeMouseDown($event, 'top-right')"></div>
        <div class="_resize-handle _resize-bottom-left" data-resize-dir="bottom-left" (mousedown)="onResizeMouseDown($event, 'bottom-left')"></div>
        <div class="_resize-handle _resize-bottom-right" data-resize-dir="bottom-right" (mousedown)="onResizeMouseDown($event, 'bottom-right')"></div>
      }
    </div>
  `,
})
export class SdModalControl {
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _activatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _systemConfig = inject(SdSystemConfigProvider, { optional: true });
  private readonly _destroyRef = inject(DestroyRef);

  open = model(false);
  key = input<string | undefined>(undefined);
  title = input("");
  hideHeader = input(false);
  hideCloseButton = input(false);
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
  headerStyle = input<string | undefined>(undefined);
  noFirstControlFocusing = input(false);
  actionTplRef = input<TemplateRef<any> | undefined>(undefined);

  closeRequest = output<void>();

  private _dragState:
    | { startX: number; startY: number; startLeft: number; startTop: number }
    | undefined;

  private _resizeState:
    | {
        dir: string;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        startLeft: number;
        startTop: number;
      }
    | undefined;

  private readonly _onDocumentMouseMove: (event: MouseEvent) => void;
  private readonly _onDocumentMouseUp: () => void;

  constructor() {
    // widthPx/heightPx를 dialog 스타일에 적용
    effect(() => {
      const dialogEl = this._getDialogEl();
      if (dialogEl === null) return;

      const w = this.widthPx();
      const h = this.heightPx();
      if (w !== undefined) {
        dialogEl.style.width = `${w}px`;
      } else {
        dialogEl.style.width = "";
      }
      if (h !== undefined) {
        dialogEl.style.height = `${h}px`;
      } else {
        dialogEl.style.height = "";
      }
    });

    // key 기반 설정 복원
    effect(() => {
      const k = this.key();
      if (k === undefined || this._systemConfig == null) return;

      void this._restoreConfig(k);
    });

    // mousemove/mouseup을 document에 등록 (리사이즈 & 드래그 공용)
    this._onDocumentMouseMove = (event: MouseEvent) => {
      if (this._resizeState !== undefined) {
        this._applyResize(event);
      }
      if (this._dragState !== undefined) {
        this._applyDrag(event);
      }
    };
    this._onDocumentMouseUp = () => {
      const hadState = this._resizeState !== undefined || this._dragState !== undefined;
      this._resizeState = undefined;
      this._dragState = undefined;
      document.removeEventListener("mousemove", this._onDocumentMouseMove);
      document.removeEventListener("mouseup", this._onDocumentMouseUp);
      if (hadState) {
        void this._saveConfig();
      }
    };

    this._destroyRef.onDestroy(() => {
      document.removeEventListener("mousemove", this._onDocumentMouseMove);
      document.removeEventListener("mouseup", this._onDocumentMouseUp);
    });
  }

  onResizeMouseDown(event: MouseEvent, dir: string): void {
    event.preventDefault();
    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    const dialogRect = dialogEl.getBoundingClientRect();
    const parentRect = (dialogEl.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
    };

    this._resizeState = {
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: dialogEl.offsetWidth,
      startHeight: dialogEl.offsetHeight,
      startLeft: dialogRect.left - parentRect.left,
      startTop: dialogRect.top - parentRect.top,
    };
    document.addEventListener("mousemove", this._onDocumentMouseMove);
    document.addEventListener("mouseup", this._onDocumentMouseUp);
  }

  onHeaderMouseDown(event: MouseEvent): void {
    if (!this.movable()) return;
    if ((event.target as HTMLElement).closest("button") !== null) return;

    event.preventDefault();
    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    const dialogRect = dialogEl.getBoundingClientRect();
    const parentRect = (dialogEl.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
    };

    this._dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: dialogRect.left - parentRect.left,
      startTop: dialogRect.top - parentRect.top,
    };
    document.addEventListener("mousemove", this._onDocumentMouseMove);
    document.addEventListener("mouseup", this._onDocumentMouseUp);
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
      this._handleTabTrap(event);
    }
  }

  onDialogFocus(): void {
    this._bringToFront();
  }

  private _requestClose(): void {
    if (this._activatedModal !== null && !this._activatedModal.canDeactiveFn()) {
      return;
    }
    void this._saveConfig();
    this.closeRequest.emit();
  }

  private _handleTabTrap(event: KeyboardEvent): void {
    const hostEl = this._elRef.nativeElement;
    const focusableElements = this._getTabbableElements(hostEl);
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: 첫 요소에서 → 마지막 요소로
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 마지막 요소에서 → 첫 요소로
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private _getTabbableElements(container: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node !== null) {
      if (node instanceof HTMLElement && isTabbable(node)) {
        result.push(node);
      }
      node = walker.nextNode();
    }
    return result;
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

  private _getDialogEl(): HTMLElement | null {
    return this._elRef.nativeElement.querySelector("._dialog");
  }

  private _applyResize(event: MouseEvent): void {
    const state = this._resizeState;
    if (state === undefined) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const minW = this.minWidthPx() ?? 0;
    const minH = this.minHeightPx() ?? 0;

    let newWidth = state.startWidth;
    let newHeight = state.startHeight;
    let newLeft = state.startLeft;
    let newTop = state.startTop;

    if (state.dir.includes("right")) {
      newWidth = Math.max(state.startWidth + dx, minW);
    }
    if (state.dir.includes("left")) {
      const proposed = state.startWidth - dx;
      if (proposed >= minW) {
        newWidth = proposed;
        newLeft = state.startLeft + dx;
      }
    }
    if (state.dir.includes("bottom")) {
      newHeight = Math.max(state.startHeight + dy, minH);
    }
    if (state.dir.includes("top")) {
      const proposed = state.startHeight - dy;
      if (proposed >= minH) {
        newHeight = proposed;
        newTop = state.startTop + dy;
      }
    }

    dialogEl.style.width = `${newWidth}px`;
    dialogEl.style.height = `${newHeight}px`;
    dialogEl.style.left = `${newLeft}px`;
    dialogEl.style.top = `${newTop}px`;
  }

  private _applyDrag(event: MouseEvent): void {
    const state = this._dragState;
    if (state === undefined) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    dialogEl.style.left = `${state.startLeft + dx}px`;
    dialogEl.style.top = `${state.startTop + dy}px`;
  }

  private async _saveConfig(): Promise<void> {
    const k = this.key();
    if (k === undefined || this._systemConfig == null) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    const config: Record<string, string> = {};
    if (dialogEl.style.width !== "") config["width"] = dialogEl.style.width;
    if (dialogEl.style.height !== "") config["height"] = dialogEl.style.height;
    if (dialogEl.style.left !== "") config["left"] = dialogEl.style.left;
    if (dialogEl.style.top !== "") config["top"] = dialogEl.style.top;

    await this._systemConfig.setAsync(`sd-modal.${k}` as any, config as any);
  }

  private async _restoreConfig(k: string): Promise<void> {
    if (this._systemConfig == null) return;

    const config = (await this._systemConfig.getAsync(`sd-modal.${k}` as any)) as
      | Record<string, string | undefined>
      | undefined;
    if (config == null) return;

    const dialogEl = this._getDialogEl();
    if (dialogEl === null) return;

    if (config["width"] !== undefined) dialogEl.style.width = config["width"];
    if (config["height"] !== undefined) dialogEl.style.height = config["height"];
    if (config["left"] !== undefined) dialogEl.style.left = config["left"];
    if (config["top"] !== undefined) dialogEl.style.top = config["top"];
  }
}
