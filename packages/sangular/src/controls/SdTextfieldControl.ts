import {Component, HostBinding, Input} from "@angular/core";
import {SizeString, ThemeString} from "../commons/types";
import {Validate} from "../decorators/Validate";

@Component({
    selector: "sd-input",
    template: `
        <input [type]="type"
               [required]="required == undefined ? null : required"
               [disabled]="disabled == undefined ? null : required"
               [step]="step == undefined ? null : step"
               [min]="min == undefined ? null : min"
               [placeholder]="placeholder == undefined ? null : placeholder"
               [value]="value == undefined ? null : value"/>`
})
export class SdInputControl {
    // ----------------------------------------------
    // Input/Output
    // ----------------------------------------------

    @Input()
    @Validate({
        type: String,
        validator: (value) => ["text", "password", "number", "date", "month", "year"].includes(value)
    })
    public type: "text" | "password" | "number" | "date" | "month" | "year" = "text";

    @Input()
    @Validate("SizeString")
    @HostBinding("attr.sd-size")
    public size?: SizeString;

    @Input()
    @Validate("ThemeString")
    @HostBinding("attr.sd-theme")
    public theme?: ThemeString;

    @Input()
    @Validate(Boolean)
    @HostBinding("attr.sd-inline")
    public inline?: boolean;

    @Input()
    @Validate(Boolean)
    public disabled?: boolean;
}