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
  Output,
  SimpleChanges
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NumberUtil } from "@simplysm/sd-core-common";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0"
         (keydown.escape)="onDialogEscapeKeydown()"
         [ngStyle]="dialogStyle">
      <sd-dock-container>
        <sd-dock class="_header" *ngIf="!hideHeader">
          <a class="_close-button"
             (click)="onCloseButtonClick()"
             *ngIf="!hideCloseButton">
            <fa-icon [icon]="icons.fasXmark | async" [fixedWidth]="true"></fa-icon>
          </a>
          <h5 class="_title">{{ title }}</h5>
        </sd-dock>

        <div style="height: 100%;">
          <ng-content></ng-content>
        </div>
      </sd-dock-container>

      <ng-container *ngIf="resizable">
        <div class="_left-resize-bar"></div>
        <div class="_right-resize-bar"></div>
        <div class="_top-resize-bar"></div>
        <div class="_top-right-resize-bar"></div>
        <div class="_top-left-resize-bar"></div>
        <div class="_bottom-resize-bar"></div>
        <div class="_bottom-right-resize-bar"></div>
        <div class="_bottom-left-resize-bar"></div>
      </ng-container>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

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
        background: var(--background-color);
        @include elevation(16);

        border: 1px solid var(--theme-color-primary-darker);
        border-radius: var(--border-radius-default);

        overflow: hidden;

        &:focus {
          outline: none;
        }

        > sd-dock-container > ._header {
          user-select: none;
          background: white;

          > ._title {
            display: inline-block;
            padding: var(--gap-default) var(--gap-lg);
          }

          > ._close-button {
            display: inline-block;
            float: right;
            cursor: pointer;
            padding: var(--gap-default) var(--gap-lg);
            border-bottom-left-radius: var(--border-radius-default);
            border-top-right-radius: var(--border-radius-default);

            &:hover {
              background: var(--theme-color-grey-lighter);
            }

            &:active {
              background: var(--theme-color-grey-light);
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

      // OPEN
      opacity: 0;
      transition: opacity .1s ease-in;
      pointer-events: none;

      > ._dialog {
        transform: translateY(-25px);
        transition: transform .1s ease-in;
      }

      &[sd-open=true] {
        opacity: 1;
        pointer-events: auto;
        transition: opacity .1s ease-out;

        > ._dialog {
          transform: none;
          transition: transform .1s ease-out;
        }
      }
    }
  `]
})
export class SdModalControl implements OnChanges, AfterViewInit {
  public icons = {
    fasXmark: import("@fortawesome/pro-solid-svg-icons/faXmark").then(m => m.definition)
  };

  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input()
  @SdInputValidate({ type: String, notnull: true })
  public title = "창";

  @Input()
  @SdInputValidate(Boolean)
  public hideHeader?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public hideCloseButton?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public disableCloseByBackdrop?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public disableCloseByEscapeKey?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-float")
  public float?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public resizable?: boolean = true;

  @Input()
  public dialogStyle?: Record<string, any>;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean | undefined>();

  public constructor(private readonly _zone: NgZone,
                     private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _systemConfig: SdSystemConfigRootProvider) {
  }

  public async ngAfterViewInit(): Promise<void> {
    await this._zone.runOutsideAngular(async () => {
      const rootEl = this._elRef.nativeElement;
      const dialogEl = rootEl.findFirst("> ._dialog")!;
      const headerEl = dialogEl.findFirst("> ._header")!;

      rootEl.addEventListener("resize", (event) => {
        if (event.prevHeight !== event.newHeight) {
          this._resetDialogMaxHeight();
        }
        if (event.prevWidth !== event.newWidth) {
          this._resetDialogMaxWidth();
        }
      });

      dialogEl.addEventListener("resize", (event) => {
        if (event.prevHeight !== event.newHeight) {
          this._resetDialogMaxHeight();
        }

        if (event.prevWidth !== event.newWidth) {
          this._resetDialogMaxWidth();
        }
      });

      headerEl.addEventListener("focus", () => {
        const maxZIndex = document.body.findAll("sd-modal").filter((item) => item !== rootEl).max((el) => NumberUtil.parseInt(getComputedStyle(el).zIndex)!);
        if (maxZIndex !== undefined) {
          rootEl.style.zIndex = (maxZIndex + 1).toString();
        }
      });

      headerEl.addEventListener("mousedown", (event) => {
        this._startMove(event);
      });

      dialogEl.findFirst("> ._left-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["left"]);
      });
      dialogEl.findFirst("> ._right-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["right"]);
      });
      dialogEl.findFirst("> ._top-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["top"]);
      });
      dialogEl.findFirst("> ._top-right-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["top", "right"]);
      });
      dialogEl.findFirst("> ._top-left-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["top", "left"]);
      });
      dialogEl.findFirst("> ._bottom-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["bottom"]);
      });
      dialogEl.findFirst("> ._bottom-right-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["bottom", "right"]);
      });
      dialogEl.findFirst("> ._bottom-left-resize-bar")?.addEventListener("mousedown", (event) => {
        this._startResize(event, ["bottom", "left"]);
      });

      await this._loadConfigAsync();
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog");

    if (dialogEl && "open" in changes && this.open === true) {
      dialogEl.focus();
    }
  }

  public onCloseButtonClick(): void {
    if (this.hideCloseButton) return;
    this._setOpen(false);
  }

  public onBackdropClick(): void {
    if (this.hideCloseButton || this.disableCloseByBackdrop) return;
    this._setOpen(false);
  }

  public onDialogEscapeKeydown(): void {
    if (this.hideCloseButton || this.disableCloseByEscapeKey) return;
    this._setOpen(false);
  }

  @HostListener("document:backbutton", ["$event"])
  public onAndroidBackButtonTouch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.hideCloseButton) return;

    const focusedEl = document.activeElement as HTMLElement | undefined;
    const rootEl = this._elRef.nativeElement;
    if (focusedEl?.findParent(rootEl)) {
      this._setOpen(false);
    }
  }

  private _setOpen(value?: boolean): void {
    if (this.openChange.observed) {
      this.openChange.emit(value);
    }
    else {
      this.open = value;
    }
  }

  private _startMove(event: MouseEvent): void {
    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    const startX = event.clientX;
    const startY = event.clientY;
    const startDialogTop = dialogEl.offsetTop;
    const startDialogLeft = dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      dialogEl.style.position = "absolute";
      dialogEl.style.left = `${startDialogLeft + e.clientX - startX}px`;
      dialogEl.style.top = `${startDialogTop + e.clientY - startY}px`;
      dialogEl.style.right = "auto";
      dialogEl.style.bottom = "auto";

      if (dialogEl.offsetLeft > rootEl.offsetWidth - 100) {
        dialogEl.style.left = (rootEl.offsetWidth - 100) + "px";
      }
      if (dialogEl.offsetTop > rootEl.offsetHeight - 100) {
        dialogEl.style.top = (rootEl.offsetHeight - 100) + "px";
      }
      if (dialogEl.offsetTop < 0) {
        dialogEl.style.top = "0";
      }
      if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
        dialogEl.style.left = (-dialogEl.offsetWidth + 100) + "px";
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      await this._saveConfigAsync();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  private _startResize(event: MouseEvent, direction: ("left" | "right" | "top" | "bottom")[]): void {
    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    const startX = event.clientX;
    const startY = event.clientY;
    const startDialogHeight = dialogEl.clientHeight;
    const startDialogWidth = dialogEl.clientWidth;
    const startDialogTop = dialogEl.offsetTop;
    const startDialogLeft = dialogEl.offsetLeft;


    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      dialogEl.style.position = "absolute";
      dialogEl.style.left = `${startDialogLeft}px`;
      dialogEl.style.top = `${startDialogTop}px`;
      dialogEl.style.right = "auto";
      dialogEl.style.bottom = "auto";
      dialogEl.style.height = `${startDialogHeight}px`;

      if (direction.includes("top")) {
        dialogEl.style.top = `${startDialogTop + (e.clientY - startY)}px`;
        dialogEl.style.height = `${startDialogHeight - (e.clientY - startY)}px`;
      }
      if (direction.includes("bottom")) {
        dialogEl.style.height = `${startDialogHeight + (e.clientY - startY)}px`;
      }
      if (direction.includes("left")) {
        dialogEl.style.left = (startDialogLeft + (e.clientX - startX)) + "px";
        dialogEl.style.width = `${startDialogWidth - (e.clientX - startX)}px`;
      }
      if (direction.includes("right")) {
        dialogEl.style.width = `${startDialogWidth + (e.clientX - startX)}px`;
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      await this._saveConfigAsync();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  private _resetDialogMaxHeight(): void {
    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    const rootElStyle = getComputedStyle(rootEl);
    const rootElPaddingTopPx = NumberUtil.parseInt(rootElStyle.paddingTop) ?? 0;
    const rootElPaddingBottomPx = NumberUtil.parseInt(rootElStyle.paddingBottom) ?? 0;
    const rootElPaddingVerticalPx = rootElPaddingTopPx + rootElPaddingBottomPx;

    if (dialogEl.offsetHeight > rootEl.offsetHeight - rootElPaddingVerticalPx) {
      dialogEl.style.maxHeight = `calc(100% - ${rootElPaddingVerticalPx}px)`;
    }
  }

  private _resetDialogMaxWidth(): void {
    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    const rootElStyle = getComputedStyle(rootEl);
    const rootElPaddingLeftPx = NumberUtil.parseInt(rootElStyle.paddingLeft) ?? 0;
    const rootElPaddingRightPx = NumberUtil.parseInt(rootElStyle.paddingRight) ?? 0;
    const rootElPaddingHorizontalPx = rootElPaddingLeftPx + rootElPaddingRightPx;

    if (dialogEl.offsetHeight > rootEl.offsetHeight - rootElPaddingHorizontalPx) {
      dialogEl.style.maxHeight = `calc(100% - ${rootElPaddingHorizontalPx}px)`;
    }
  }

  private async _loadConfigAsync(): Promise<void> {
    const config = await this._systemConfig.getAsync(`sd-modal.${this.key}`);
    if (config === undefined) return;

    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    dialogEl.style.position = config.position;
    dialogEl.style.left = config.left;
    dialogEl.style.top = config.top;
    dialogEl.style.right = config.right;
    dialogEl.style.bottom = config.bottom;
    if (config.width !== undefined) {
      dialogEl.style.width = config.width;
    }
    if (config.height !== undefined) {
      dialogEl.style.height = config.height;
    }
  }

  private async _saveConfigAsync(): Promise<void> {
    if (this.key === undefined) return;

    const rootEl = this._elRef.nativeElement;
    const dialogEl = rootEl.findFirst("> ._dialog")!;

    await this._systemConfig.setAsync(`sd-modal.${this.key}`, {
      position: dialogEl.style.position,
      left: dialogEl.style.left,
      top: dialogEl.style.top,
      right: dialogEl.style.right,
      bottom: dialogEl.style.bottom,
      width: dialogEl.style.width,
      height: dialogEl.style.height
    });
  }
}
