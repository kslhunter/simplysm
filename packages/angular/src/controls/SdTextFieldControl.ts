import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    Output,
    ViewChild
} from "@angular/core";
import {Exception, Safe} from "@simplism/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
    selector: "sd-text-field",
    template: `
        <input [placeholder]="placeholder"
               [value]="displayValue === undefined ? null : displayValue"
               (input)="onInput($event)"
               [type]="type === 'number' ? 'text' : type"
               [ngClass]="styleClass"
               [disabled]="disabled"
               [maxLength]="maxLength || 524288"
               [ngStyle]="getStyle()"
               [required]="required"
               (touchend)="onTouchend()"
               (blur)="onBlur()"
               [name]="autoComplete"
               [autocomplete]="autoComplete ? 'on' : 'off'"
               #input/>
        <div class="_sd-text-field-button-group">
            <ng-content></ng-content>
        </div>`,
    host: {
        "[class._inline]": "inline"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTextFieldControl implements AfterViewInit {
    private _size = "default";
    private _style: { [key: string]: any } = {};
    displayValue: any;

    @Input() validator?: (value: any | undefined) => boolean;
    @Input() autoComplete?: string;
    @Output() valueChange = new EventEmitter<any>();

    @Input()
    set value(value: any) {
        this._value = value;
        this.reloadDisplayValue();
    }

    private _value: any;

    @Input()
    set step(value: number | undefined) {
        if (value === null || value === undefined) {
            value = 1;
        }
        if (typeof value !== "number") {
            throw new Exception(`'sd-text-field.step'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._step = value;
    }

    private _step = 1;

    @Input() placeholder = "";
    @Input() inline = false;
    @Input() disabled = false;
    @Input() required = false;
    @Input() maxLength: number | undefined = undefined;
    @Input() min: number | undefined = undefined;
    @Input() max: number | undefined = undefined;

    @ViewChild("input") inputElementRef?: ElementRef;

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

    @Input()
    set type(value: string) {
        if (!["text", "password", "number", "date", "month", "year"].includes(value)) {
            throw new Exception(`'sd-text-field.type'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._type = value;
        this.reloadDisplayValue();
    }

    get type(): string {
        return this._type;
    }

    private _type = "text";

    @Input()
    set size(value: string) {
        if (!["default", "sm"].includes(value)) {
            throw new Exception(`'sd-text-field.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._size = value;
    }

    get styleClass(): string[] {
        let hasError = false;
        if (this.type === "number") {
            if (this._value === undefined && !this.required) {
                hasError = hasError || false;
            }
            else {
                const stepLeft = (this._step.toString().split(".")[0] || "0");
                const stepRight = (this._step.toString().split(".")[1] || "");
                const stepLeftLength = stepLeft.includes("1") ? stepLeft.length : 0;
                const stepRightLength = stepRight.includes("1") ? stepRight.length : 0;
                const valueLeftLength = this._value !== undefined ? Safe.obj(this._value.toString().split(".")[0]).length : 0;
                const valueRightLength = this._value !== undefined ? Safe.obj(this._value.toString().split(".")[1]).length : 0;

                if (valueLeftLength < stepLeftLength) {
                    hasError = hasError || true;
                }
                if (valueRightLength > stepRightLength) {
                    hasError = hasError || true;
                }
            }
        }

        if (this.min !== undefined && this._value < this.min) {
            hasError = hasError || true;
        }
        if (this.max !== undefined && this._value > this.max) {
            hasError = hasError || true;
        }

        if (this.validator) {
            hasError = hasError || !this.validator(this._value);
        }

        return [
            this.inline ? "_inline" : "",
            this._size ? "_size-" + this._size : "",
            this.disabled ? "_disabled" : "",
            "_type-" + this.type,
            hasError ? "_error" : ""
        ].filter(item => item);
    }

    getStyle(): { [key: string]: any } {
        return this._style;
    }

    constructor(private _elementRef: ElementRef,
                private _zone: NgZone) {
    }


    ngAfterViewInit(): void {
        this._zone.runOutsideAngular(() => {
            const $this = $(this._elementRef.nativeElement);
            SimgularHelpers.detectElementChange($this.children("._sd-text-field-button-group").get(0), () => {
                if (
                    $this
                        .children("._sd-text-field-button-group")
                        .children()
                        .toArray()
                        .some(item => !["sd-button"].includes(item.tagName.toLowerCase()))
                ) {
                    throw new Error(`"sd-text-field"안에는, "sd-button"외의 엘리먼트를 사용할 수 없습니다.`);
                }
                this._resizingButtonGroup();
            }, {resize: false});
        });
    }

    private _resizingButtonGroup(): void {
        const $input = $(this._elementRef.nativeElement).children("input");
        const $buttonGroup = $(this._elementRef.nativeElement).children("._sd-text-field-button-group");

        $input.css("padding-right", $buttonGroup.outerWidth() || "");
        $buttonGroup.css({
            top: getComputedStyle($input.get(0)).borderTopWidth + "px",
            right: getComputedStyle($input.get(0)).borderRightWidth + "px"
        });
    }

    private _inputTimeout?: number;

    onInput(e: Event): void {
        window.clearTimeout(this._inputTimeout!);

        this.displayValue = $(e.target!).val();

        this._inputTimeout = setTimeout(() => {
            const prevValue = this._value;
            this.reloadValue();
            const newValue = this._value;
            if (prevValue !== newValue) {
                this.valueChange.emit(this._value);
            }
        });
    }

    onTouchend(): void {
        const $input = $(this._elementRef.nativeElement).children("input");
        $input.trigger("select");
    }

    onBlur(): void {
        this.reloadDisplayValue();
    }

    reloadDisplayValue(): void {
        if (this._value === undefined) {
            //tslint:disable-next-line:no-null-keyword
            this.displayValue = null;
        }
        else if (this.type === "number") {
            this.displayValue = this._value.toLocaleString();
        }
        else {
            this.displayValue = this._value;
        }
    }

    reloadValue(): void {
        if (this.type === "number") {
            if (this.displayValue === undefined || this.displayValue === null) {
                this._value = undefined;
            }
            else {
                const value = Number(this.displayValue.toString().replace(/[^0-9.]/g, ""));
                this._value = Number.isNaN(value) ? undefined : value;
            }
        }
        else {
            this._value = this.displayValue;
        }
    }
}