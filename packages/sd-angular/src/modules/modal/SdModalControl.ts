import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnInit,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdLocalStorageProvider} from "../shared/SdLocalStorageProvider";
import {optional} from "@simplysm/sd-core";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0" [style.minHeight]="minHeight"
         (focus)="onDialogFocus($event)">
      <sd-dock-container>
        <sd-dock class="_header" (mousedown)="onHeaderMouseDown($event)">
          <h5 class="_title">{{ title }}</h5>
          <a class="_close-button"
             (click)="onCloseButtonClick()"
             *ngIf="!hideCloseButton">
            <sd-icon [icon]="'times'" [fw]="true"></sd-icon>
          </a>
        </sd-dock>

        <sd-pane class="_content">
          <ng-content></ng-content>
        </sd-pane>
      </sd-dock-container>
      <div class="_left-resizer" (mousedown)="onResizerMousedown($event, 'left')"></div>
      <div class="_right-resizer" (mousedown)="onResizerMousedown($event, 'right')"></div>
      <div class="_bottom-resizer" (mousedown)="onResizerMousedown($event, 'bottom')"></div>
      <div class="_all-right-resizer" (mousedown)="onResizerMousedown($event, 'all-right')"></div>
      <div class="_all-left-resizer" (mousedown)="onResizerMousedown($event, 'all-left')"></div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";
    @import "../../../scss/variables-scss";

    sd-modal {
      display: block;
      position: fixed;
      z-index: var(--z-index-modal);
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      text-align: center;
      padding-top: calc(var(--topbar-height) / 2);
      overflow: auto;

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
        display: inline-block;
        text-align: left;
        margin: 0 auto;
        background: white;
        overflow: hidden;
        max-width: 100%;
        min-width: 240px;
        border: 1px solid var(--theme-primary-dark);

        &:focus {
          outline-color: transparent;
        }

        > sd-dock-container {
          > ._header {
            background: var(--theme-primary-default);
            color: var(--text-reverse-color-default);

            > ._title {
              display: inline-block;
              padding: var(--gap-default) var(--gap-lg);
            }

            > ._close-button {
              float: right;
              cursor: pointer;
              text-align: center;
              padding: var(--gap-default) var(--gap-lg);
              color: var(--text-reverse-color-dark);

              &:hover {
                background: rgba(0, 0, 0, .1);
                color: var(--text-reverse-color-default);
              }

              &:active {
                background: rgba(0, 0, 0, .2);
              }
            }
          }
        }

        > ._left-resizer {
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          cursor: ew-resize;

          /*&:hover {
            background: rgba(0, 0, 0, .3);
          }*/
        }

        > ._right-resizer {
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          cursor: ew-resize;

          /*&:hover {
            background: rgba(0, 0, 0, .3);
          }*/
        }

        > ._bottom-resizer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          cursor: ns-resize;

          /*&:hover {
            background: rgba(0, 0, 0, .3);
          }*/
        }

        > ._all-right-resizer {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 4px;
          height: 4px;
          z-index: 1;
          cursor: nwse-resize;

          /*&:hover {
            background: rgba(0, 0, 0, .3);
          }*/
        }

        > ._all-left-resizer {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 4px;
          height: 4px;
          cursor: nesw-resize;
          z-index: 1;

          /*&:hover {
            background: rgba(0, 0, 0, .1);
          }*/
        }
      }

      opacity: 0;
      transition: opacity .3s ease-in-out;
      pointer-events: none;

      > ._dialog {
        transform: translateY(-25px);
        transition: transform .3s ease-in-out;
      }

      &[sd-open=true] {
        opacity: 1;
        pointer-events: auto;

        > ._dialog {
          transform: none;
          @include elevation(16);
        }
      }

      &[sd-float=true] {
        pointer-events: none;

        > ._backdrop {
          display: none;
        }

        > ._dialog {
          pointer-events: auto;
          right: var(--gap-lg);
          bottom: var(--gap-lg);
          border-radius: 0;
          opacity: 0;
          @include elevation(4);

          &:focus {
            @include elevation(16);
          }
        }

        &[sd-open=true] {
          > ._dialog {
            opacity: 1;
          }
        }
      }

      @media screen and (max-width: $screen-mobile-width) {
        padding-top: 0;

        > ._dialog {
          width: 100%;
          height: 100%;
        }
      }
    }
  `]
})
export class SdModalControl implements OnInit {
  @Input()
  @SdTypeValidate({type: String, notnull: true})
  public title!: string;

  @Input()
  @SdTypeValidate(Boolean)
  public hideCloseButton?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public useCloseByBackdrop?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  public close = new EventEmitter<any>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-float")
  public float?: boolean;

  @Input()
  @SdTypeValidate(String)
  public minHeight?: string;

  private _sizeConfig: { width?: number; height?: number } | undefined;

  public closeButtonClickHandler?: () => boolean | Promise<boolean>;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _localStorage: SdLocalStorageProvider) {
  }

  public ngOnInit(): void {
    const dialogEl = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;

    this._sizeConfig = this._localStorage.get(`sd-modal.${this.title}.size-config`);
    if (this._sizeConfig) {
      dialogEl.style.width = this._sizeConfig.width + "px";
      dialogEl.style.height = this._sizeConfig.height + "px";
    }

    dialogEl.addEventListener("resize", event => {
      if (event.detail["dimensions"].includes("height")) {
        const el = (this._elRef.nativeElement as HTMLElement);
        const style = getComputedStyle(el);
        if (dialogEl.offsetHeight > el.offsetHeight - (optional(() => Number.parseInt(style.paddingTop!.match(/\d/g)!.join(""), 10) * 2) || 0)) {
          dialogEl.style.height = `calc(100% - ${getComputedStyle(el).paddingTop})`;
        }
      }
    });
  }

  public onBackdropClick(): void {
    if (this.hideCloseButton) {
      return;
    }
    if (!this.useCloseByBackdrop) {
      return;
    }

    this.onCloseButtonClick();
  }

  public onCloseButtonClick(): void {
    if (this.closeButtonClickHandler) {
      const isContinue = this.closeButtonClickHandler();
      if (!isContinue) {
        return;
      }
    }

    this.open = false;
    this.close.emit();
  }

  public onHeaderMouseDown(event: MouseEvent): void {
    const dialogEl = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      dialogEl.style.position = "absolute";
      dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
      dialogEl.style.top = `${startTop + e.clientY - startY}px`;
      dialogEl.style.right = `auto`;
      dialogEl.style.bottom = `auto`;

      const el = (this._elRef.nativeElement as HTMLElement);
      if (dialogEl.offsetLeft > el.offsetWidth - 100) {
        dialogEl.style.left = (el.offsetWidth - 100) + "px";
      }
      if (dialogEl.offsetTop > el.offsetHeight - 100) {
        dialogEl.style.top = (el.offsetHeight - 100) + "px";
      }
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);
    };

    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
  }

  public onDialogFocus(event: FocusEvent): void {
    const maxZIndex = document.body.findAll("sd-modal").max(el => Number(getComputedStyle(el).zIndex)) || 4000;

    const currModalEl = (event.target as HTMLElement).findParent("sd-modal") as HTMLElement;
    currModalEl.style.zIndex = (maxZIndex + 1).toString();
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.hideCloseButton) {
      return;
    }

    if (event.key === "Escape") {
      this.onCloseButtonClick();
    }
  }

  @HostListener("window:resize", ["$event"])
  public onWindowResize(event: Event): void {
    const dialogEl = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;
    const el = (this._elRef.nativeElement as HTMLElement);
    if (dialogEl.offsetLeft > el.offsetWidth - 100) {
      dialogEl.style.left = (el.offsetWidth - 100) + "px";
    }
    if (dialogEl.offsetTop > el.offsetHeight - 100) {
      dialogEl.style.top = (el.offsetHeight - 100) + "px";
    }
  }

  @HostListener("document:backbutton", ["$event"])
  public onAndroidBackButtonTouch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.hideCloseButton) {
      return;
    }

    this.onCloseButtonClick();
  }

  public onResizerMousedown(event: MouseEvent, direction: "left" | "right" | "bottom" | "all-left" | "all-right"): void {
    const dialogEl = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;
    // console.log(dialogEl.style.left, dialogEl.style.top);

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = dialogEl.clientHeight;
    const startWidth = dialogEl.clientWidth;
    const startLeft = dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (direction === "bottom" || direction === "all-right" || direction === "all-left") {
        dialogEl.style.height = `${startHeight + e.clientY - startY}px`;
      }
      if (direction === "right" || direction === "all-right") {
        dialogEl.style.width = `${startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2)}px`;
      }
      if (direction === "left" || direction === "all-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.left = (startLeft + (e.clientX - startX)) + "px";
        }
        dialogEl.style.width = `${startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2)}px`;
      }
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

      this._sizeConfig = this._sizeConfig || {};
      if (direction === "right" || direction === "left" || direction === "all-right" || direction === "all-left") {
        this._sizeConfig.width = dialogEl.style.width ? Number(dialogEl.style.width.replace("px", "")) : undefined;
      }

      if (direction === "bottom" || direction === "all-right" || direction === "all-left") {
        this._sizeConfig.height = dialogEl.style.height ? Number(dialogEl.style.height.replace("px", "")) : undefined;
      }

      this._saveSizeConfig();
    };
    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
  }

  private _saveSizeConfig(): void {
    this._localStorage.set(`sd-modal.${this.title}.size-config`, this._sizeConfig);
  }
}
