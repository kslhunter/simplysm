import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Injector,
    Input,
    OnChanges,
    Output,
    SimpleChanges
} from "@angular/core";
import {Exception} from "../../../sd-core/src";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SdSizeString, SdThemeString} from "../helpers/types";
import {SdButtonGroupControl} from "./SdButtonGroupControl";

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
                <sd-icon [icon]="search" [fixedWidth]="true"></sd-icon>
            </div>
            <div class="fa-pull-right"
                 *ngIf="type === 'barcode'">
                <sd-icon [icon]="'barcode'" [fixedWidth]="true"></sd-icon>
            </div>
            <div class="_sd-button-content">
                <ng-content></ng-content>
            </div>
        </button>
        <div *ngIf="!required && !disabled && type === 'search'">
            <a (click)="onDeselectClick($event)">
                <sd-icon [icon]="'times'" [fixedWidth]="true"></sd-icon>
            </a>
        </div>`,
    host: {
        "[class._deselectable]": "!required && !disabled && type === 'search'",
        "[class._inline]": "inline"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButtonControl implements AfterViewInit, OnChanges {
    @Input() public size?: SdSizeString;
    @Input() public theme?: SdThemeString;
    @Output() public readonly deselect = new EventEmitter<void>();

    public ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            size: "SdSizeString",
            theme: "SdThemeString"
        });
    }

    @Input()
    public set focusable(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.focusable'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        const $button = $(this._elementRef.nativeElement).children().first();
        if (value) {
            $button.off("focus.sd.button");
        }
        else {
            $button.on("focus.sd.button", (e) => {
                e.preventDefault();
                $button.trigger("blur");
            });
        }
    }

    @Input()
    public set inline(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.inline'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._inline = value;
    }

    public get inline(): boolean {
        return this._inline;
    }

    private _inline = false;

    @Input()
    public set disabled(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.disabled'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._disabled = value;
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    private _disabled = false;

    @Input()
    public set selected(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-button.selected'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._selected = value;
    }

    private _selected = false;

    @Input() public required = false;

    @Input()
    public set style(value: string) {
        const styles = value.split(";");
        for (const style of styles) {
            if (style.includes(":") && style.split(":").length === 2) {
                const name = style.split(":")[0].trim();
                this._style[name] = style.split(":")[1].trim();
            }
        }
    }

    private _style: { [key: string]: any } = {};

    @Input() public class: string | undefined;

    public getStyle(): { [key: string]: any } {
        return this._style;
    }

    @Input()
    public set type(value: string) {
        if (!["default", "search", "barcode"].includes(value)) {
            throw new Exception(`'sd-button.type'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._type = value;
    }

    public get type(): string {
        return this._type;
    }

    private _type = "default";

    /*@Output() click = new EventEmitter<MouseEvent>();*/

    public get styleClass(): string[] {
        //tslint:disable-next-line:no-null-keyword
        const parentButtonGroup = this._injector.get(SdButtonGroupControl, null);
        return [
            this._inline ? "_inline" : "",
            this.theme ? `_theme-${this.theme}` : "",
            this.size ? `_size-${this.size}` : (parentButtonGroup && parentButtonGroup.size ? `_size-${parentButtonGroup.size}` : ""),
            this._selected ? "_selected" : "",
            this.type === "search" ? "_type-search" : "",
            this.type === "barcode" ? "_type-barcode" : ""
        ].concat((this.class || "").split(" ")).filter((item) => item);
    }

    public constructor(private _elementRef: ElementRef,
                       private _injector: Injector) {
    }

    public ngAfterViewInit(): void {
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

    public onDeselectClick(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.deselect.emit();
    }
}