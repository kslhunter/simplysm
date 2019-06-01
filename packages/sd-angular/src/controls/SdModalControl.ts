import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnInit
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdLocalStorageProvider} from "../providers/SdLocalStorageProvider";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    </div>`
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

  public constructor(private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _localStorage: SdLocalStorageProvider) {
  }

  public ngOnInit(): void {
    const dialogEl = this._elRef.nativeElement.findAll("> ._dialog")[0] as HTMLElement;

    this._sizeConfig = this._localStorage.get(`sd-modal.${this.title}.size-config`);
    if (this._sizeConfig) {
      dialogEl.style.width = this._sizeConfig.width + "px";
      dialogEl.style.height = this._sizeConfig.height + "px";
    }

    dialogEl.addEventListener("resize", event => {
      if (event.detail["dimensions"].includes("height")) {
        const el = this._elRef.nativeElement;
        const style = getComputedStyle(el);
        if (dialogEl.offsetHeight > el.offsetHeight - (Number.parseInt(style.paddingTop!.match(/\d/g)!.join(""), 10) * 2)) {
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
    const el = this._elRef.nativeElement.findAll("> ._dialog")[0] as HTMLElement;
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
    const el = this._elRef.nativeElement.findAll("> ._dialog")[0] as HTMLElement;

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
