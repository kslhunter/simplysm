import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {DateOnly} from "@simplism/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SizeStrings} from "../helpers/types";

@Component({
    selector: "sd-date-picker",
    template: `
        <sd-textfield [type]="type"
                      [value]="value"
                      [disabled]="disabled"
                      [size]="size"
                      [required]="required"
                      (valueChange)="onValueChange($event)">
        </sd-textfield>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDatePickerControl implements OnChanges {
    @Input() type: "date" | "month" | "year" = "date";
    @Input() value?: DateOnly;
    @Input() required = false;
    @Input() disabled = false;
    @Input() size?: SizeStrings;
    @Output() valueChange = new EventEmitter<DateOnly | undefined>();

    ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            type: {
                type: String,
                validator: value => ["date", "month", "year"].includes(value),
                required: true
            },
            value: DateOnly,
            required: Boolean,
            disabled: Boolean,
            size: "SizeStrings"
        });
    }

    onValueChange(value: any): void {
        this.valueChange.emit(DateOnly.parse(value));
    }
}