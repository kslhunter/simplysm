import {ApplicationRef, ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit} from "@angular/core";

@Component({
    selector: "sd-dropdown",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDropdownControl implements OnInit, OnDestroy {
    @Input()
    public set open(value: boolean) {
        this._open = value;
        this.redraw();
    }

    private _open = false;

    public $parent: JQuery | undefined;

    public constructor(private _elementRef: ElementRef,
                       private _appRef: ApplicationRef) {
    }

    public ngOnInit(): void {
        const $this = $(this._elementRef!.nativeElement);
        this.$parent = $this.parent();
        const rootComp = this._appRef.components[0];
        const $rootComp = $(rootComp.location.nativeElement);
        $rootComp.append($this);
    }

    public ngOnDestroy(): void {
        $(this._elementRef!.nativeElement).remove();
    }

    public redraw(): void {
        if (!this.$parent) return;

        const $this = $(this._elementRef!.nativeElement);
        if (this._open) {
            $this.css({
                "display": "block",
                "top": this.$parent.offset()!.top + this.$parent.outerHeight()!,
                "left": this.$parent.offset()!.left,
                "min-width": this.$parent.outerWidth()!
            });
        }
        else {
            $this.css("display", "none");
        }
    }
}