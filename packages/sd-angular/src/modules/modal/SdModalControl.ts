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
import {SdLocalStorageProvider} from "../local-storage/SdLocalStorageProvider";
import {optional} from "@simplysm/sd-core";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0" [style.minHeight]="minHeight">
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
    @import "../../../scss/presets";

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

          &:hover {
            background: rgba(0, 0, 0, .3);
          }
        }

        > ._right-resizer {
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          cursor: ew-resize;

          &:hover {
            background: rgba(0, 0, 0, .3);
          }
        }

        > ._bottom-resizer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          cursor: ns-resize;

          &:hover {
            background: rgba(0, 0, 0, .3);
          }
        }

        > ._all-right-resizer {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 4px;
          height: 4px;
          z-index: 1;
          cursor: nwse-resize;

          &:hover {
            background: rgba(0, 0, 0, .3);
          }
        }

        > ._all-left-resizer {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 4px;
          height: 4px;
          cursor: nesw-resize;
          z-index: 1;

          &:hover {
            background: rgba(0, 0, 0, .1);
          }
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
        }

        &[sd-open=true] {
          > ._dialog {
            opacity: 1;
          }
        }
      }

      @media screen and (max-width: var(--screen-mobile-width)) {
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
    this.open = false;
    this.close.emit();
  }

  public onHeaderMouseDown(event: MouseEvent): void {
    const el = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = el.offsetTop;
    const startLeft = el.offsetLeft;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      el.style.position = "absolute";
      el.style.left = `${startLeft + e.clientX - startX}px`;
      el.style.top = `${startTop + e.clientY - startY}px`;
      el.style.right = `auto`;
      el.style.bottom = `auto`;
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

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.hideCloseButton) {
      return;
    }

    if (event.key === "Escape") {
      this.onCloseButtonClick();
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
    const el = (this._elRef.nativeElement as HTMLElement).findAll("> ._dialog")[0] as HTMLElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = el.clientHeight;
    const startWidth = el.clientWidth;

    const doDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (direction === "bottom" || direction === "all-right" || direction === "all-left") {
        el.style.height = `${startHeight + e.clientY - startY}px`;
      }
      if (direction === "right" || direction === "all-right") {
        el.style.width = `${startWidth + (e.clientX - startX) * 2}px`;
      }
      if (direction === "left" || direction === "all-left") {
        el.style.width = `${startWidth - (e.clientX - startX) * 2}px`;
      }
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

      this._sizeConfig = this._sizeConfig || {};
      if (direction === "right" || direction === "left" || direction === "all-right" || direction === "all-left") {
        this._sizeConfig.width = el.style.width ? Number(el.style.width.replace("px", "")) : undefined;
      }

      if (direction === "bottom" || direction === "all-right" || direction === "all-left") {
        this._sizeConfig.height = el.style.height ? Number(el.style.height.replace("px", "")) : undefined;
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
