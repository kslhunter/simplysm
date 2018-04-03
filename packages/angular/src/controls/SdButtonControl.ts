import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Injector,
    Input,
    Output
} from "@angular/core";
import {Exception} from "@simplism/core";
import {SdButtonGroupControl} from "./SdButtonGroupControl";
import {SimgularHelpers} from "../helpers/SimgularHelpers";


@Component({
    selector: "sd-button",
    template: `
        <button type="button"
                [ngClass]="styleClass"
                [disabled]="disabled"
                [ngStyle]="getStyle()"
                [attr.required]="required">
            <div class="fa-pull-right"
                 *ngIf="type === 'search'">
                <i class="fas fa-fw fa-search"></i>
            </div>
            <div class="fa-pull-right"
                 *ngIf="type === 'barcode'">
                <i class="fas fa-fw fa-barcode"></i>
            </div>
            <div class="_sd-button-content">
                <ng-content></ng-content>
            </div>
        </button>
        <div *ngIf="!required && !disabled && type === 'search'">
            <a (click)="onDeselectClick($event)">
                <i class="fas fa-fw fa-times"></i>
            </a>
        </div>`,
    host: {
        "[class._deselectable]": "!required && !disabled && type === 'search'",
        "[class._inline]": "inline"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButtonControl implements AfterViewInit {
    @Output() deselect = new EventEmitter<void>();

    @Input()
    set size(value: string) {
        if (!["xxs", "xs", "sm", "default", "lg", "xl", "xxl"].includes(value)) {
            throw new Exception(`'sd-button.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._size = value;
    }

    private _size?: string = undefined;

    @Input()
    set theme(value: string) {
        if (!["default", "primary", "warning", "danger", "info", "success"].includes(value)) {
            throw new Exception(`'sd-button.theme'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._theme = value;
    }

    private _theme = "default";


    @Input()
    set focusable(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.focusable'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        const $button = $(this._elementRef.nativeElement).children().first();
        if (value) {
            $button.off("focus.sd.button");
        }
        else {
            $button.on("focus.sd.button", e => {
                e.preventDefault();
                $button.trigger("blur");
            });
        }
    }

    @Input()
    set inline(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.inline'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._inline = value;
    }

    get inline(): boolean {
        return this._inline;
    }

    private _inline = false;

    @Input()
    set disabled(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.disabled'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._disabled = value;
    }

    get disabled(): boolean {
        return this._disabled;
    }

    private _disabled = false;

    @Input()
    set selected(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.selected'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._selected = value;
    }

    private _selected = false;

    @Input() required = false;

    @Input()
    set style(value: string) {
        const styles = value.split(";");
        for (const style of styles) {
            if (style.includes(":") && style.split(":").length === 2) {
                const name = style.split(":")[0].trim();
                this._style[name] = style.split(":")[1].trim();
            }
        }
    }

    private _style: { [key: string]: any } = {};

    @Input() class: string | undefined;

    getStyle(): { [key: string]: any } {
        return this._style;
    }

    @Input()
    set type(value: string) {
        if (!["default", "search", "barcode"].includes(value)) {
            throw new Exception(`'sd-button.type'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._type = value;
    }

    get type(): string {
        return this._type;
    }

    private _type = "default";

    /*@Output() click = new EventEmitter<MouseEvent>();*/

    get styleClass(): string[] {
        //tslint:disable-next-line:no-null-keyword
        const parentButtonGroup = this._injector.get(SdButtonGroupControl, null);
        return [
            this._inline ? "_inline" : "",
            this._theme ? "_theme-" + this._theme : "",
            this._size ? "_size-" + this._size : (parentButtonGroup && parentButtonGroup.size ? "_size-" + parentButtonGroup.size : ""),
            this._selected ? "_selected" : "",
            this.type === "search" ? "_type-search" : "",
            this.type === "barcode" ? "_type-barcode" : ""
        ].concat((this.class || "").split(" ")).filter(item => item);
    }

    constructor(private _elementRef: ElementRef,
                private _injector: Injector) {
    }

    ngAfterViewInit(): void {
        const $button = $(this._elementRef.nativeElement).children("button");
        const $content = $button.children("._sd-button-content");
        SimgularHelpers.detectElementChange($content.get(0), () => {
            this._reloadError();
        }, {resize: false});
        this._reloadError();
    }

    private _reloadError(): void {
        const $button = $(this._elementRef.nativeElement).children("button");
        const $content = $button.children("._sd-button-content");
        if (this.required && !$content.text().trim()) {
            $button.addClass("_error");
        }
        else {
            $button.removeClass("_error");
        }
    }

    onDeselectClick(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.deselect.emit();
    }
}