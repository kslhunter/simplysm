import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnInit,
  Output
} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";
import {NeverEntryError} from "@simplysm/sd-core-common";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0"
         (keydown.escape)="onDialogEscapeKeydown($event)">
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
      <div class="_bottom-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom')"></div>
      <div class="_bottom-right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-right')"></div>
      <div class="_bottom-left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-left')"></div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-backdrop: 1;
    $z-dialog: 2;

    :host {
      display: block;
      position: fixed;
      z-index: var(--z-index-modal);
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding-top: calc(var(--sd-topbar-height) / 2);

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
        border-radius: 2px;
        overflow: hidden;
        @include elevation(16);

        &:focus {
          outline: none;
        }

        /deep/ > sd-dock-container {
          > ._header {
            background: var(--theme-color-primary-default);
            color: var(--text-brightness-rev-default);
            //border-bottom: 1px solid var(--theme-color-primary-darker);

            ._title {
              display: inline-block;
              padding: var(--gap-sm) var(--gap-default);
            }

            ._close-button {
              display: inline-block;
              float: right;
              cursor: pointer;
              text-align: center;
              padding: var(--gap-sm) var(--gap-default);
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
export class SdModalEntryControl implements OnInit {
  @Input()
  @SdInputValidate({type: String, notnull: true})
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

  private readonly _el: HTMLElement;
  private _dialogEl!: HTMLElement;
  private _dialogHeaderEl!: HTMLElement;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone) {
    this._el = this._elRef.nativeElement;
  }

  public ngOnInit(): void {
    this._dialogEl = this._el.findFirst("> ._dialog")!;
    this._dialogHeaderEl = this._dialogEl.findFirst("._header")!;

    this._zone.runOutsideAngular(() => {
      this._dialogEl.addEventListener("resize", event => {
        if (event.prevHeight !== event.newHeight) {
          const style = getComputedStyle(this._el);
          if (style.paddingTop != undefined) {
            const paddingTopMatch = (/(\d*)/).exec(style.paddingTop);
            if (!paddingTopMatch || paddingTopMatch[1] === undefined) throw new NeverEntryError();
            const paddingTop = (Number.parseInt(paddingTopMatch[1], 10) ?? 0);

            if (this._dialogEl.offsetHeight > this._el.offsetHeight - paddingTop) {
              this._dialogEl.style.height = `calc(100% - ${paddingTop * 2}px)`;
              this._dialogEl.style.maxHeight = `calc(100% - ${paddingTop * 2}px)`;
            }
          }
        }
      });

      this._dialogEl.addEventListener("focus", () => {
        const maxZIndex = document.body.findAll("sd-modal").max(el => Number(getComputedStyle(el).zIndex));
        if (maxZIndex !== undefined) {
          this._el.style.zIndex = (maxZIndex + 1).toString();
        }
      });

      this._dialogHeaderEl.addEventListener("mousedown", event => {
        this.onHeaderMouseDown(event);
      });
    });
  }

  public onCloseButtonClick(): void {
    if (this.hideCloseButton) {
      return;
    }

    this.open = false;
    this.openChange.emit(this.open);
  }

  public onBackdropClick(): void {
    if (this.hideCloseButton || !this.useCloseByBackdrop) {
      return;
    }

    this.open = false;
    this.openChange.emit(this.open);
  }

  public onDialogEscapeKeydown(event: KeyboardEvent): void {
    if (this.hideCloseButton || !this.useCloseByEscapeKey) {
      return;
    }

    this.open = false;
    this.openChange.emit(this.open);
  }

  @HostListener("document:backbutton", ["$event"])
  public onAndroidBackButtonTouch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.hideCloseButton) {
      return;
    }

    this.open = false;
    this.openChange.emit(this.open);
  }

  @HostListener("window:resize", ["$event"])
  public onWindowResize(event: Event): void {
    if (this._dialogEl.offsetLeft > this._el.offsetWidth - 100) {
      this._dialogEl.style.left = (this._el.offsetWidth - 100) + "px";
    }
    if (this._dialogEl.offsetTop > this._el.offsetHeight - 100) {
      this._dialogEl.style.right = (this._el.offsetHeight - 100) + "px";
    }
  }

  public onResizeBarMousedown(event: MouseEvent, direction: "left" | "right" | "bottom" | "bottom-left" | "bottom-right"): void {
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = this._dialogEl.clientHeight;
    const startWidth = this._dialogEl.clientWidth;
    const startLeft = this._dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
        this._dialogEl.style.height = `${startHeight + e.clientY - startY}px`;
      }
      if (direction === "right" || direction === "bottom-right") {
        this._dialogEl.style.width = `${startWidth + ((e.clientX - startX) * (this._dialogEl.style.position === "absolute" ? 1 : 2))}px`;
      }
      if (direction === "left" || direction === "bottom-left") {
        if (this._dialogEl.style.position === "absolute") {
          this._dialogEl.style.left = (startLeft + (e.clientX - startX)) + "px";
        }
        this._dialogEl.style.width = `${startWidth - ((e.clientX - startX) * (this._dialogEl.style.position === "absolute" ? 1 : 2))}px`;
      }
    };

    const stopDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);
    };
    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  public onHeaderMouseDown(event: MouseEvent): void {
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = this._dialogEl.offsetTop;
    const startLeft = this._dialogEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
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
    };

    const stopDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }
}