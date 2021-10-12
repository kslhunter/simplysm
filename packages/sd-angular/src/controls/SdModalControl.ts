import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0"
         (keydown.escape)="onDialogEscapeKeydown()"
         [style.width.px]="(minWidthPx && (minWidthPx > (widthPx || 0))) ? minWidthPx : widthPx"
         [style.height.px]="(minHeightPx && (minHeightPx > (heightPx || 0))) ? minHeightPx : heightPx">
      <sd-dock-container>
        <sd-dock class="_header" (mousedown)="onHeaderMouseDown($event)">
          <sd-anchor class="_close-button"
                     (click)="onCloseButtonClick()"
                     *ngIf="!hideCloseButton">
            <sd-icon icon="times" fixedWidth></sd-icon>
          </sd-anchor>
          <h5 class="_title">{{ title }}</h5>
        </sd-dock>

        <sd-pane class="_content">
          <ng-content></ng-content>
        </sd-pane>
      </sd-dock-container>

      <div class="_left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'left')"></div>
      <div class="_right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'right')"></div>
      <div class="_top-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top')"></div>
      <div class="_top-right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top-right')"></div>
      <div class="_top-left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top-left')"></div>
      <div class="_bottom-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom')"></div>
      <div class="_bottom-right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-right')"></div>
      <div class="_bottom-left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-left')"></div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      position: fixed;
      z-index: var(--z-index-modal);
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding-top: calc(var(--sd-topbar-height) + var(--gap-sm));

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
        border: 1px solid var(--theme-color-primary-darker);
        //border-radius: 2px;
        overflow: hidden;
        @include elevation(16);

        &:focus {
          outline: none;
        }

        /deep/ > sd-dock-container {
          > ._header {
            background: var(--theme-color-primary-default);
            color: var(--text-brightness-rev-default);
            user-select: none;
            //border-bottom: 1px solid var(--theme-color-primary-darker);

            ._title {
              display: inline-block;
              //padding: var(--gap-sm) var(--gap-default);
              padding: var(--gap-default) var(--gap-lg);
            }

            ._close-button,
            ._clear-config-button {
              display: inline-block;
              float: right;
              cursor: pointer;
              text-align: center;
              //padding: var(--gap-sm) var(--gap-default);
              padding: var(--gap-default) var(--gap-lg);
              color: var(--text-brightness-rev-dark);

              &:hover {
                background: rgba(0, 0, 0, .2);
                color: var(--text-brightness-rev-default);
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

      @media screen and (max-width: 480px) {
        padding-top: 0;

        > ._dialog {
          width: 100%;
          height: 100%;
        }
      }
    }
  `]
})
export class SdModalControl implements OnInit, AfterViewInit, OnChanges {
  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input()
  @SdInputValidate({ type: String, notnull: true })
  public title = "창";

  @Input()
  @SdInputValidate(Boolean)
  public hideCloseButton?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useCloseByBackdrop?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useCloseByEscapeKey?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-float")
  public float?: boolean;

  @Input("height.px")
  @SdInputValidate(Number)
  public heightPx?: number;

  @Input("width.px")
  @SdInputValidate(Number)
  public widthPx?: number;

  @Input("min-hHeight.px")
  @SdInputValidate(Number)
  public minHeightPx?: number;

  @Input("min-width.px")
  @SdInputValidate(Number)
  public minWidthPx?: number;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["bottom-right", "top-right"]
  })
  @HostBinding("attr.sd-position")
  public position?: "bottom-right" | "top-right";

  private _config?: ISdModalConfigVM;

  private readonly _el: HTMLElement;
  private _dialogEl?: HTMLElement;
  private _dialogHeaderEl!: HTMLElement;

  public initialized = false;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone,
                     private readonly _systemConfig: SdSystemConfigRootProvider) {
    this._el = this._elRef.nativeElement;
  }

  public ngOnInit(): void {
    this._dialogEl = this._el.findFirst("> ._dialog")!;
    this._dialogHeaderEl = this._dialogEl.findFirst("._header")!;

    this._zone.runOutsideAngular(() => {
      if (!this._dialogEl) throw new NeverEntryError();

      this._dialogEl.addEventListener("resize", (event) => {
        if (event.prevHeight !== event.newHeight) {
          const style = getComputedStyle(this._el);
          if (style.paddingTop !== "") {
            if (!this._dialogEl) throw new NeverEntryError();

            const paddingTopMatch = (/(\d*)/).exec(style.paddingTop);
            if (!paddingTopMatch || typeof paddingTopMatch[1] === "undefined") throw new NeverEntryError();
            const paddingTopNum = Number.parseInt(paddingTopMatch[1], 10);
            const paddingTop = Number.isNaN(paddingTopNum) ? 0 : paddingTopNum;

            if (this._dialogEl.offsetHeight > this._el.offsetHeight - paddingTop) {
              this._dialogEl.style.maxHeight = `calc(100% - ${paddingTop * 2}px)`;
              this._dialogEl.style.height = `calc(100% - ${paddingTop * 2}px)`;
            }
          }
        }
      });

      this._dialogEl.addEventListener("focus", () => {
        const maxZIndex = document.body.findAll("sd-modal").max((el) => Number(getComputedStyle(el).zIndex));
        if (maxZIndex !== undefined) {
          this._el.style.zIndex = (maxZIndex + 1).toString();
        }
      });

      this._dialogHeaderEl.addEventListener("mousedown", (event) => {
        this.onHeaderMouseDown(event);
      });
    });

    this.initialized = true;
  }

  public async ngAfterViewInit(): Promise<void> {
    if (this.key !== undefined) {
      this._config = await this._systemConfig.getAsync(`sd-modal.${this.key}`);
      if (this._config) {
        if (!this._dialogEl) throw new NeverEntryError();

        this._dialogEl.style.position = this._config.position;
        this._dialogEl.style.left = this._config.left;
        this._dialogEl.style.top = this._config.top;
        this._dialogEl.style.right = this._config.right;
        this._dialogEl.style.bottom = this._config.bottom;
        if (this._config.width) {
          this._dialogEl.style.width = this._config.width;
        }
        if (this._config.height) {
          this._dialogEl.style.height = this._config.height;
        }
      }
    }
    this._el.setAttribute("sd-init", "true");

    if (this.open === true) {
      if (!this._dialogEl) throw new NeverEntryError();

      this._dialogEl.focus();
    }
  }


  public ngOnChanges(changes: SimpleChanges): void {
    if ("open" in changes) {
      if (this.open === true && this._dialogEl) {
        this._dialogEl.focus();
      }
    }
  }

  public onCloseButtonClick(): void {
    if (this.hideCloseButton) {
      return;
    }

    if (this.openChange.observers.length > 0) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  public onBackdropClick(): void {
    if (this.hideCloseButton || !this.useCloseByBackdrop) {
      return;
    }

    if (this.openChange.observers.length > 0) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  public onDialogEscapeKeydown(): void {
    if (this.hideCloseButton || !this.useCloseByEscapeKey) {
      return;
    }

    if (this.openChange.observers.length > 0) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  @HostListener("document:backbutton", ["$event"])
  public onAndroidBackButtonTouch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const focusedEl = document.activeElement as HTMLElement | undefined;
    if (focusedEl?.findParent(this._el)) {
      if (this.hideCloseButton) {
        return;
      }

      if (this.openChange.observers.length > 0) {
        this.openChange.emit(false);
      }
      else {
        this.open = false;
      }
    }
  }

  @HostListener("window:resize", ["$event"])
  public onWindowResize(event: Event): void {
    if (!this._dialogEl) throw new NeverEntryError();

    if (this._dialogEl.offsetLeft > this._el.offsetWidth - 100) {
      this._dialogEl.style.left = (this._el.offsetWidth - 100) + "px";
    }
    if (this._dialogEl.offsetTop > this._el.offsetHeight - 100) {
      this._dialogEl.style.right = (this._el.offsetHeight - 100) + "px";
    }
  }

  public onResizeBarMousedown(event: MouseEvent,
                              direction: "left" | "right" |
                                "top" | "top-left" | "top-right" |
                                "bottom" | "bottom-left" | "bottom-right"): void {
    if (!this._dialogEl) throw new NeverEntryError();

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = this._dialogEl.clientHeight;
    const startWidth = this._dialogEl.clientWidth;
    const startTop = this._dialogEl.offsetTop;
    const startLeft = this._dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      if (!this._dialogEl) throw new NeverEntryError();

      e.stopPropagation();
      e.preventDefault();

      if (direction === "top" || direction === "top-right" || direction === "top-left") {
        if (this._dialogEl.style.position === "absolute") {
          this._dialogEl.style.top = (startTop + (e.clientY - startY)) + "px";
          this._dialogEl.style.bottom = "auto";
        }
        this._dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), this.minHeightPx ?? 0)}px`;
      }
      if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
        this._dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, this.minHeightPx ?? 0)}px`;
      }
      if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
        this._dialogEl.style.width = `${Math.max(startWidth + ((e.clientX - startX) * (this._dialogEl.style.position === "absolute" ? 1 : 2)), this.minWidthPx ?? 0)}px`;
      }
      if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
        if (this._dialogEl.style.position === "absolute") {
          this._dialogEl.style.left = (startLeft + (e.clientX - startX)) + "px";
        }
        this._dialogEl.style.width = `${Math.max(startWidth - ((e.clientX - startX) * (this._dialogEl.style.position === "absolute" ? 1 : 2)), this.minWidthPx ?? 0)}px`;
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      if (!this._dialogEl) throw new NeverEntryError();

      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      this._config = {
        position: this._dialogEl.style.position,
        left: this._dialogEl.style.left,
        top: this._dialogEl.style.top,
        right: this._dialogEl.style.right,
        bottom: this._dialogEl.style.bottom,
        width: this._dialogEl.style.width,
        height: this._dialogEl.style.height
      };
      if (this.key !== undefined) {
        await this._systemConfig.setAsync(`sd-modal.${this.key}`, this._config);
      }
    };
    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  public onHeaderMouseDown(event: MouseEvent): void {
    if (!this._dialogEl) throw new NeverEntryError();

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = this._dialogEl.offsetTop;
    const startLeft = this._dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      if (!this._dialogEl) throw new NeverEntryError();

      e.stopPropagation();
      e.preventDefault();

      this._dialogEl.style.position = "absolute";
      this._dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
      this._dialogEl.style.top = `${startTop + e.clientY - startY}px`;
      this._dialogEl.style.right = `auto`;
      this._dialogEl.style.bottom = `auto`;

      const el = (this._elRef.nativeElement as HTMLElement);
      if (this._dialogEl.offsetLeft > el.offsetWidth - 100) {
        this._dialogEl.style.left = (el.offsetWidth - 100) + "px";
      }
      if (this._dialogEl.offsetTop > el.offsetHeight - 100) {
        this._dialogEl.style.top = (el.offsetHeight - 100) + "px";
      }
      if (this._dialogEl.offsetTop < 0) {
        this._dialogEl.style.top = "0";
      }
      if (this._dialogEl.offsetLeft < 1 && (this._dialogEl.offsetLeft < ((-1 * Math.floor(el.offsetWidth / 2))) + 200)) {
        this._dialogEl.style.left = (-1 * Math.floor(el.offsetWidth / 2)) + "px";
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      if (!this._dialogEl) throw new NeverEntryError();

      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      this._config = {
        position: this._dialogEl.style.position,
        left: this._dialogEl.style.left,
        top: this._dialogEl.style.top,
        right: this._dialogEl.style.right,
        bottom: this._dialogEl.style.bottom,
        width: this._dialogEl.style.width,
        height: this._dialogEl.style.height
      };
      if (this.key !== undefined) {
        await this._systemConfig.setAsync(`sd-modal.${this.key}`, this._config);
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
