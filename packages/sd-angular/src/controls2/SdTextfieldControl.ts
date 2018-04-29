import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThemeStrings} from "..";
import {DateOnly} from "../../../sd-core/src";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SizeStrings} from "../helpers/types";

@Component({
    selector: "sd-textfield",
    template: `
        <input [type]="type"
               [required]="required"
               [disabled]="disabled"
               [attr.step]="step"
               [attr.min]="min"
               [attr.placeholder]="placeholder"
               [value]="value == undefined ? null : value"
               (input)="onInput($event)"/>`,
    host: {
        "[attr.sd-inline]": "inline",
        "[attr.sd-size]": "size",
        "[attr.sd-theme]": "theme"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTextfieldControl implements OnChanges {
    //-- Input/Output
    @Input() public type: "text" | "password" | "number" | "date" | "month" | "year" = "text";
    @Input() public placeholder?: string;
    @Input() public value?: string | number | DateOnly;
    @Input() public required?: boolean;
    @Input() public disabled?: boolean;
    @Input() public step?: number;
    @Input() public min?: number;
    @Input() public inline?: boolean;
    @Input() public size?: SizeStrings;
    @Input() public theme?: ThemeStrings;
    @Output() public readonly valueChange = new EventEmitter<string | number | DateOnly | undefined>();

    public ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            type: {
                type: String,
                validator: (value) => ["text", "password", "number", "date", "month", "year"].includes(value),
                required: true
            },
            placeholder: String,
            value: [String, Number, DateOnly],
            required: Boolean,
            disabled: Boolean,
            step: Number,
            min: Number,
            inline: Boolean,
            size: "SizeStrings",
            theme: "ThemeStrings"
        });
    }

    public onInput(event: Event): void {
        const targetEl = event.target as HTMLInputElement;
        if (this.type === "number") {
            const num = Number(targetEl.value);
            if (Number.isNaN(num)) {
                this.valueChange.emit(undefined);
            }
            else {
                this.valueChange.emit(num);
            }
        }
        else if (this.type === "date" || this.type === "month" || this.type === "year") {
            const date = DateOnly.parse(targetEl.value);
            this.valueChange.emit(date);
        }
        else {
            this.valueChange.emit(targetEl.value);
        }
    }
}