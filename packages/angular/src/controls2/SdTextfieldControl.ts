import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SizeStrings} from "../helpers/types";
import {DateOnly} from "@simplism/core";
import {ThemeStrings} from "..";

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
    @Input() type: "text" | "password" | "number" | "date" | "month" | "year" = "text";
    @Input() placeholder?: string;
    @Input() value?: string | number | DateOnly;
    @Input() required?: boolean;
    @Input() disabled?: boolean;
    @Input() step?: number;
    @Input() min?: number;
    @Input() inline?: boolean;
    @Input() size?: SizeStrings;
    @Input() theme?: ThemeStrings;
    @Output() valueChange = new EventEmitter<string | number | DateOnly | undefined>();

    ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            type: {
                type: String,
                validator: value => ["text", "password", "number", "date", "month", "year"].includes(value),
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

    onInput(event: Event): void {
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