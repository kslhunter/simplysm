import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Injector, Input, Output} from "@angular/core";
import {Exception, JsonConvert} from "@simplism/core";
import {SdButtonGroupControl} from "./SdButtonGroupControl";
import {ThemeStrings} from "..";


@Component({
    selector: "sd-select",
    template: `
        <select [ngClass]="styleClass"
                [disabled]="disabled"
                [ngStyle]="getStyle()"
                [value]="valueJson"
                [required]="required"
                (change)="onChange($event)">
            <ng-content></ng-content>
        </select>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSelectControl {
    @Input()
    set size(value: string) {
        if (!["xxs", "xs", "sm", "default", "lg", "xl", "xxl"].includes(value)) {
            throw new Exception(`'sd-select.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._size = value;
    }

    private _size?: string = undefined;

    @Input()
    set focusable(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-select.focusable'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        const $button = $(this._elementRef.nativeElement).children().first();
        if (value) {
            $button.off("focus.sd.disabled");
        }
        else {
            $button.on("focus.sd.disabled", e => {
                e.preventDefault();
                $button.trigger("blur");
            });
        }
    }

    @Input()
    set inline(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-select.inline'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._inline = value;
    }

    private _inline = false;

    @Input()
    set disabled(value: any) {
        this._disabled = !!value;
    }

    get disabled(): any {
        return this._disabled;
    }

    private _disabled = false;

    @Input() required = false;

    get styleClass(): string[] {
        //tslint:disable-next-line:no-null-keyword
        const parentButtonGroup = this._injector.get(SdButtonGroupControl, null);
        return [
            this._inline ? "_inline" : "",
            this._size ? "_size-" + this._size : (parentButtonGroup && parentButtonGroup.size ? "_size-" + parentButtonGroup.size : ""),
            this.theme ? "_theme-" + this.theme : ""
        ].filter(item => item);
    }

    @Input()
    set style(value: string) {
        const styles = value.split(";");
        for (const style of styles) {
            if (style.includes(":")) {
                const name = style.split(":")[0];
                this._style[name] = style.split(":")[1];
            }
        }
    }

    getStyle(): { [key: string]: any } {
        return this._style;
    }

    private _style: { [key: string]: any } = {};

    @Input()
    set value(value: any) {
        this._value = value;
    }

    get valueJson(): string {
        if (this.keyField) {
            const selectedOptionElem = $(this._elementRef.nativeElement).find("option").toArray()
                .singleOr(undefined, elem => {
                    const itemValueJson = $(elem).attr("value");
                    const itemValue = JsonConvert.parse(itemValueJson);
                    if (this._value === undefined && itemValue === undefined) {
                        return true;
                    }
                    else if (this._value !== undefined && itemValue !== undefined) {
                        return itemValue[this.keyField!] === this._value[this.keyField!];
                    }
                    else {
                        return false;
                    }
                }) as HTMLOptionElement;

            return selectedOptionElem ? selectedOptionElem.value : JsonConvert.stringify(undefined);
        }
        else {
            return JsonConvert.stringify(this._value);
        }
    }

    private _value: any;

    @Output() valueChange = new EventEmitter<any>();

    @Input() keyField: string | undefined;

    @Input() theme?: ThemeStrings;

    constructor(private _elementRef: ElementRef,
                private _injector: Injector) {
    }

    onChange(e: Event): void {
        const value = (e.target as HTMLSelectElement).value;
        this._value = value === undefined ? undefined : JsonConvert.parse(value);
        this.valueChange.emit(this._value);
    }
}

@Component({
    selector: "option",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionControl {
    @Input()
    set value(value: any) {
        $(this._elementRef.nativeElement).attr("value", JsonConvert.stringify(value));
    }

    constructor(private _elementRef: ElementRef) {
    }
}