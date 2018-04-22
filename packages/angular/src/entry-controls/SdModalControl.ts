import {AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, NgZone} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
    template: `
        <div class="_backdrop"></div>
        <div class="_dialog">
            <div class="_header">
                <h4 class="_title">{{title}}</h4>
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
    `,
    host: {
        "class": "_sd-modal",
        "tabindex": "0"
    }
})
export class SdModalControl implements AfterViewInit {
    @Input() title = "창";
    @Input() hideCloseButton = false;

    close = new EventEmitter<any>();

    constructor(private _elementRef: ElementRef,
                private _zone: NgZone) {
    }

    ngAfterViewInit(): void {
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

    resizing(): void {
        const $modal = $(this._elementRef.nativeElement);
        const $dialog = $modal.children("._dialog");

        let newHeight = "0";

        //-- 모바일
        if ($(window).innerWidth()! < 640) {
            newHeight = $dialog.outerHeight()! >= $(window).innerHeight()! ? "100%" : "";
            /*newHeight = "100%";*/
        }
        //-- 일반
        else {
            newHeight = $dialog.outerHeight()! > $(window).innerHeight()! - 100 ? "calc(100% - 50px)" : "";
        }
        $dialog.css("height", newHeight);
    }

    onCloseButtonClick(): void {
        this.close.emit();
    }

    @HostListener("document:backbutton", ["$event"])
    onBackButtonClick(e: Event): void {
        e.preventDefault();

        if (this.hideCloseButton) return;

        const $this = $(this._elementRef.nativeElement);
        const $lastModal = $("body").find("._sd-modal._open").last();
        if ($this.get(0) === $lastModal.get(0)) {
            this.close.emit();
        }
    }

    @HostListener("keydown", ["$event"])
    onKeydown(event: KeyboardEvent): void {
        if (this.hideCloseButton) return;

        if (event.key === "Escape") {
            this.close.emit();
        }
    }
}