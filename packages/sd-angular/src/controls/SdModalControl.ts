import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0" [style.height]="height">
      <sd-dock-container>
        <sd-dock class="_header"
                 (mousedown)="onHeaderMouseDown($event)">
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
    </div>`
})
export class SdModalControl {
  @Input()
  @SdTypeValidate({type: String, notnull: true})
  public title!: string;

  @Input()
  @SdTypeValidate(Boolean)
  public hideCloseButton?: boolean;

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
  public height?: string;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public onBackdropClick(): void {
    if (this.hideCloseButton) {
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
}
