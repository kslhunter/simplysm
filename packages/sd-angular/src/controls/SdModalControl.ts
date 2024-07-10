import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import {NumberUtil} from "@simplysm/sd-core-common";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdPaneControl} from "./SdPaneControl";
import {SdSystemConfigProvider} from "../providers/SdSystemConfigProvider";
import {SdIconControl} from "./SdIconControl";
import {coercionBoolean, coercionNumber} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";
import {SdEventsDirective} from "../directives/SdEventsDirective";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdDockControl} from "./SdDockControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAnchorControl,
    SdPaneControl,
    SdIconControl,
    SdDockContainerControl,
    SdDockControl,
    SdEventsDirective
  ],
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div #dialogEl
         class="_dialog" tabindex="0"
         (keydown.escape)="onDialogEscapeKeydown()"
         [style.min-width.px]="minWidthPx"
         [style.min-height.px]="minHeightPx"
         [style.width.px]="(minWidthPx && widthPx && minWidthPx > widthPx) ? minWidthPx : widthPx"
         [style.height.px]="(minHeightPx && heightPx && minHeightPx > heightPx) ? minHeightPx : heightPx"
         (focus.outside)="onDialogFocusOutside()"
         (sdResize.outside)="onDialogResizeOutside($event)">
      <sd-dock-container>
        @if (!hideHeader) {
          <sd-dock class="_header" (mousedown.outside)="onHeaderMouseDownOutside($event)"
                   [style]="headerStyle">
            @if (!hideCloseButton) {
              <sd-anchor class="_close-button"
                         (click)="onCloseButtonClick()">
                <sd-icon [icon]="icons.xmark" fixedWidth/>
              </sd-anchor>
            }
            <h5 class="_title">{{ title }}</h5>
          </sd-dock>
        }

        <sd-pane class="_content">
          <ng-content></ng-content>
        </sd-pane>
      </sd-dock-container>

      @if (resizable) {
        <div class="_left-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'left')"></div>
        <div class="_right-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'right')"></div>
        <div class="_top-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'top')"></div>
        <div class="_top-right-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'top-right')"></div>
        <div class="_top-left-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'top-left')"></div>
        <div class="_bottom-resize-bar" (mousedown.outside)="onResizeBarMousedownOutside($event, 'bottom')"></div>
        <div class="_bottom-right-resize-bar"
             (mousedown.outside)="onResizeBarMousedownOutside($event, 'bottom-right')"></div>
        <div class="_bottom-left-resize-bar"
             (mousedown.outside)="onResizeBarMousedownOutside($event, 'bottom-left')"></div>
      }
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

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
        background: rgba(0, 0, 0, .6);
      }

      > ._dialog {
        position: relative;
        display: block;
        margin: 0 auto;
        width: fit-content;
        min-width: 240px;
        background: white;
        //border: 1px solid var(--theme-primary-darker);
        // border-radius:2 px;
        overflow: hidden;
        @include elevation(16);

        border-radius: var(--border-radius-default);

        &:focus {
          outline: none;
        }

        > sd-dock-container {
          > ._header {
            user-select: none;
            border-bottom: 1px solid var(--trans-light);

            ._title {
              display: inline-block;
              // padding:var(--gap-sm) var(--gap-default);
              padding: var(--gap-default) var(--gap-lg);
            }

            ._close-button,
            ._clear-config-button {
              display: inline-block;
              float: right;
              cursor: pointer;
              text-align: center;
              padding: var(--gap-default) var(--gap-lg);

              &:hover {
                background: var(--theme-grey-lightest);
              }

              &:active {
                background: rgba(0, 0, 0, .4);
              }
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
      transition: opacity .1s ease-in-out;
      pointer-events: none;

      > ._dialog {
        transform: translateY(-25px);
        transition: transform .1s ease-in-out;
      }

      &[sd-open=true][sd-init=true] {
        opacity: 1;
        pointer-events: auto;

        > ._dialog {
          transform: none;
        }
      }

      &[sd-float=true] {
        pointer-events: none;

        > ._backdrop {
          display: none;
        }

        > ._dialog {
          pointer-events: auto;
          opacity: 0;
          @include elevation(4);
          border: 1px solid var(--theme-grey-lighter);

          &:focus {
            @include elevation(16);
          }
        }

        &[sd-open=true][sd-init=true] {
          pointer-events: none;

          > ._dialog {
            pointer-events: auto;
            opacity: 1;
          }
        }
      }

      &[sd-position="bottom-right"] {
        > ._dialog {
          position: absolute;
          right: calc(var(--gap-xxl) * 2);
          bottom: var(--gap-xxl);
        }
      }

      &[sd-position="top-right"] {
        > ._dialog {
          position: absolute;
          right: var(--gap-xxl);
          top: var(--gap-xxl);
        }
      }

      @media all and (max-width: 520px) {
        padding-top: 0;

        > ._dialog {
          width: 100%;
          height: 100%;

          border: none;
          border-radius: 0;

          > sd-dock-container > ._header {
            background: transparent;
            color: var(--text-trans-lighter);

            ._close-button,
            ._clear-config-button {
              color: var(--text-trans-lighter);

              &:hover {
                background: transparent;
                color: var(--text-trans-lighter);
              }
            }
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-open]": "open",
    "[attr.sd-float]": "float",
    "[attr.sd-position]": "position"
  }
})
export class SdModalControl implements DoCheck {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input({transform: coercionBoolean}) open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() key?: string;
  @Input({required: true}) title!: string;
  @Input({transform: coercionBoolean}) hideHeader = false;
  @Input({transform: coercionBoolean}) hideCloseButton = false;
  @Input({transform: coercionBoolean}) useCloseByBackdrop = false;
  @Input({transform: coercionBoolean}) useCloseByEscapeKey = false;
  @Input({transform: coercionBoolean}) resizable = false;
  @Input({transform: coercionBoolean}) movable = true;
  @Input({transform: coercionBoolean}) float = false;
  @Input({transform: coercionNumber}) heightPx?: number;
  @Input({transform: coercionNumber}) widthPx?: number;
  @Input({transform: coercionNumber}) minHeightPx?: number;
  @Input({transform: coercionNumber}) minWidthPx?: number;
  @Input() position?: "bottom-right" | "top-right";
  @Input() headerStyle?: string;

  @ViewChild("dialogEl", {static: true}) dialogElRef!: ElementRef<HTMLElement>;

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #sdSystemConfig = inject(SdSystemConfigProvider);

  #config?: ISdModalConfigVM;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheckOutside(async run => {
      await run({
        key: [this.key],
      }, async () => {
        this.#config = await this.#sdSystemConfig.getAsync(`sd-modal.${this.key}`);
      });

      run({
        config: [this.#config],
        open: [this.open]
      }, () => {
        if (this.#config) {
          this.dialogElRef.nativeElement.style.position = this.#config.position;
          this.dialogElRef.nativeElement.style.left = this.#config.left;
          this.dialogElRef.nativeElement.style.top = this.#config.top;
          this.dialogElRef.nativeElement.style.right = this.#config.right;
          this.dialogElRef.nativeElement.style.bottom = this.#config.bottom;
          if (this.#config.width) {
            this.dialogElRef.nativeElement.style.width = this.#config.width;
          }
          if (this.#config.height) {
            this.dialogElRef.nativeElement.style.height = this.#config.height;
          }
        }

        this.#elRef.nativeElement.setAttribute("sd-init", "true");
      });

      run({
        open: [this.open]
      }, () => {
        if (this.open) {
          this.dialogElRef.nativeElement.focus();
        }
      });
    });
  }

  onDialogFocusOutside() {
    const maxZIndex = document.body.findAll("sd-modal").max((el) => Number(getComputedStyle(el).zIndex));
    if (maxZIndex !== undefined) {
      this.#elRef.nativeElement.style.zIndex = (maxZIndex + 1).toString();
    }
  }

  @HostListener("sdResize.outside", ["$event"])
  onResizeOutside(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this.#calcHeight();
    }
    if (event.widthChanged) {
      this.#calcWidth();
    }
  }

  onDialogResizeOutside(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this.#calcHeight();
    }
    if (event.widthChanged) {
      this.#calcWidth();
    }
  }

  #calcHeight() {
    const style = getComputedStyle(this.#elRef.nativeElement);
    let paddingTop = style.paddingTop === "" ? 0 : NumberUtil.parseInt(style.paddingTop) ?? 0;

    if (this.dialogElRef.nativeElement.offsetHeight > this.#elRef.nativeElement.offsetHeight - paddingTop) {
      this.dialogElRef.nativeElement.style.maxHeight = `calc(100% - ${paddingTop * 2}px)`;
      this.dialogElRef.nativeElement.style.height = `calc(100% - ${paddingTop * 2}px)`;
    }
  }

  #calcWidth() {
    if (this.dialogElRef.nativeElement.offsetWidth > this.#elRef.nativeElement.offsetWidth) {
      this.dialogElRef.nativeElement.style.maxWidth = `100%`;
      this.dialogElRef.nativeElement.style.width = `100%`;
    }
  }

  @HostListener("window:resize.outside")
  onWindowResizeOutside() {
    if (this.dialogElRef.nativeElement.offsetLeft > this.#elRef.nativeElement.offsetWidth - 100) {
      this.dialogElRef.nativeElement.style.left = (this.#elRef.nativeElement.offsetWidth - 100) + "px";
    }
    if (this.dialogElRef.nativeElement.offsetTop > this.#elRef.nativeElement.offsetHeight - 100) {
      this.dialogElRef.nativeElement.style.right = (this.#elRef.nativeElement.offsetHeight - 100) + "px";
    }
  }

  onCloseButtonClick() {
    if (this.hideCloseButton) {
      return;
    }

    if (this.openChange.observed) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  onBackdropClick() {
    if (this.hideCloseButton || !this.useCloseByBackdrop) {
      return;
    }

    if (this.openChange.observed) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  onDialogEscapeKeydown() {
    if (this.hideCloseButton || !this.useCloseByEscapeKey) {
      return;
    }

    if (this.openChange.observed) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  onResizeBarMousedownOutside(event: MouseEvent,
                              direction: "left" | "right" |
                                "top" | "top-left" | "top-right" |
                                "bottom" | "bottom-left" | "bottom-right") {
    if (!this.resizable) return;

    const dialogEl = this.dialogElRef.nativeElement;

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
          dialogEl.style.top = (startTop + (e.clientY - startY)) + "px";
          dialogEl.style.bottom = "auto";
        }
        dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), this.minHeightPx ?? 0)}px`;
      }
      if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
        dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, this.minHeightPx ?? 0)}px`;
      }
      if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
        dialogEl.style.width = `${Math.max(startWidth + ((e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2)), this.minWidthPx ?? 0)}px`;
      }
      if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.left = (startLeft + (e.clientX - startX)) + "px";
        }
        dialogEl.style.width = `${Math.max(startWidth - ((e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2)), this.minWidthPx ?? 0)}px`;
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      this.#config = {
        position: dialogEl.style.position,
        left: dialogEl.style.left,
        top: dialogEl.style.top,
        right: dialogEl.style.right,
        bottom: dialogEl.style.bottom,
        width: dialogEl.style.width,
        height: dialogEl.style.height
      };
      if (this.key !== undefined && isDoDrag) {
        await this.#sdSystemConfig.setAsync(`sd-modal.${this.key}`, this.#config);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  onHeaderMouseDownOutside(event: MouseEvent) {
    if (!this.movable) return;

    const dialogEl = this.dialogElRef.nativeElement;

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

      const el = this.#elRef.nativeElement;
      if (dialogEl.offsetLeft > el.offsetWidth - 100) {
        dialogEl.style.left = (el.offsetWidth - 100) + "px";
      }
      if (dialogEl.offsetTop > el.offsetHeight - 100) {
        dialogEl.style.top = (el.offsetHeight - 100) + "px";
      }
      if (dialogEl.offsetTop < 0) {
        dialogEl.style.top = "0";
      }
      if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
        dialogEl.style.left = (-dialogEl.offsetWidth + 100) + "px";
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      this.#config = {
        position: dialogEl.style.position,
        left: dialogEl.style.left,
        top: dialogEl.style.top,
        right: dialogEl.style.right,
        bottom: dialogEl.style.bottom,
        width: dialogEl.style.width,
        height: dialogEl.style.height
      };
      if (this.key !== undefined && isDoDrag) {
        await this.#sdSystemConfig.setAsync(`sd-modal.${this.key}`, this.#config);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }
}

export interface ISdModalConfigVM {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
}
