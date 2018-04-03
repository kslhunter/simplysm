import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {DateOnly, Exception} from "@simplism/core";

@Component({
    selector: "sd-date-picker",
    template: `
        <sd-text-field [type]="type"
                       [value]="type === 'month' ? value?.toFormatString('yyyy-MM') : type === 'year' ? value?.toFormatString('yyyy') : value"
                       [disabled]="disabled"
                       [size]="size"
                       [required]="required"
                       (valueChange)="onValueChange($event)">
        </sd-text-field>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDatePickerControl {
    @Input()
    set type(value: "date" | "month" | "year") {
        if (!["date", "month", "year"].includes(value)) {
            throw new Exception(`'sd-date-picker.type'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        this._type = value || "date";
    }

    get type(): "date" | "month" | "year" {
        return this._type;
    }

    private _type: "date" | "month" | "year" = "date";

    @Input()
    set value(value: DateOnly | undefined) {
        if (!(value === undefined || value instanceof DateOnly)) {
            throw new Exception(`'sd-date-picker.value'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        this._value = value;
    }

    private _value: DateOnly | undefined;

    @Output() valueChange = new EventEmitter<DateOnly | undefined>();
    @Input() disabled = false;
    @Input() required = false;
    @Input() size = "default";

    get value(): DateOnly | undefined {
        return this._value;
    }

    onValueChange(value: any): void {
        this.valueChange.emit(DateOnly.parse(value));
    }
}