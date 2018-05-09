import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone
} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
  selector: "sd-modal",
  template: `
    <div class="_backdrop"></div>
    <div class="_dialog">
      <div class="_header">
        <h4 class="_title">{{ title }}</h4>
        <a class="_close-button"
           (click)="onCloseButtonClick()"
           *ngIf="!hideCloseButton">
          <sd-icon [icon]="'times'" [fixedWidth]="true"></sd-icon>
        </a>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class SdModalControl implements AfterViewInit {
  @Input() public title = "창";
  @Input() public hideCloseButton = false;

  public close = new EventEmitter<any>();

  @HostBinding("class")
  public classString = "_sd-modal";

  @HostBinding("tabindex")
  public tabindex = 0;

  public constructor(private readonly _elementRef: ElementRef,
                     private readonly _zone: NgZone) {
  }

  public ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      setTimeout(() => {
        const $this = $(this._elementRef.nativeElement);
        $this.addClass("_open");
        $this.one("transitionend", () => {
          this.resizing();
        });

        $this.trigger("focus");
      });

      SimgularHelpers.detectElementChange(this._elementRef.nativeElement, () => {
        this.resizing();
      });
    });
  }

  public resizing(): void {
    const $modal = $(this._elementRef.nativeElement);
    const $dialog = $modal.children("._dialog");

    // 모바일
    const newHeight = $(window).innerWidth()! < 640
      ? $dialog.outerHeight()! >= $(window).innerHeight()!
        ? "100%"
        : ""
      : $dialog.outerHeight()! > $(window).innerHeight()! - 100 ? "calc(100% - 50px)" : "";
    $dialog.css("height", newHeight);
  }

  public onCloseButtonClick(): void {
    this.close.emit();
  }

  @HostListener("document:backbutton", ["$event"])
  public onBackButtonClick(e: Event): void {
    e.preventDefault();

    if (this.hideCloseButton) {
      return;
    }

    const $this = $(this._elementRef.nativeElement);
    const $lastModal = $("body").find("._sd-modal._open").last();
    if ($this.get(0) === $lastModal.get(0)) {
      this.close.emit();
    }
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.hideCloseButton) {
      return;
    }

    if (event.key === "Escape") {
      this.close.emit();
    }
  }
}
