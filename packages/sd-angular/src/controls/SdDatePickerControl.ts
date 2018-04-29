import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {DateOnly} from "../../../sd-core/src";
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
    @Input() public type: "date" | "month" | "year" = "date";
    @Input() public value?: DateOnly;
    @Input() public required = false;
    @Input() public disabled = false;
    @Input() public size?: SizeStrings;
    @Output() public readonly valueChange = new EventEmitter<DateOnly | undefined>();

    public ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            type: {
                type: String,
                validator: (value) => ["date", "month", "year"].includes(value),
                required: true
            },
            value: DateOnly,
            required: Boolean,
            disabled: Boolean,
            size: "SizeStrings"
        });
    }

    public onValueChange(value: any): void {
        this.valueChange.emit(DateOnly.parse(value));
    }
}