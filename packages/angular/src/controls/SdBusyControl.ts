import {Component, ElementRef, Input} from "@angular/core";

@Component({
    selector: "sd-busy",
    template: `
        <ng-content></ng-content>`
})
export class SdBusyControl {
    private _$busy: JQuery;
    private _$prevActivate: JQuery | undefined;

    @Input() set value(value: boolean) {
        const $this = $(this._elementRef.nativeElement);

        if (value === true) {
            $this.get(0).addEventListener("focus", this._prevent.bind(this), true);
            if ($this.has(document.activeElement).length > 0) {
                this._$prevActivate = document.activeElement ? $(document.activeElement) : undefined;
                if (this._$prevActivate) {
                    $this.attr("tabindex", "1");
                    $this.trigger("focus");
                    /*this._$prevActivate.trigger("blur");*/
                }
            } else {
                this._$prevActivate = undefined;
            }

            this._$busy.addClass("_open");
        }
        else {
            $this.removeAttr("tabindex");
            this._$busy.removeClass("_open");

            $this.get(0).removeEventListener("focus", this._prevent.bind(this), true);
            if (this._$prevActivate) {
                this._$prevActivate.trigger("focus");
            }
        }
    }

    constructor(private _elementRef: ElementRef) {
        this._$busy = $("<div class='_sd-busy'><div><div></div><div></div></div></div>").appendTo(this._elementRef.nativeElement);
        this._$busy.get(0).offsetHeight;
    }

    private _prevent(e: Event): void {
        e.preventDefault();
    }
}