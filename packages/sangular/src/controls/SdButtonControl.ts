import {Component, HostBinding, Input} from "@angular/core";
import {SizeString, ThemeString} from "../commons/types";
import {Validate} from "../decorators/Validate";

@Component({
    selector: "sd-button",
    template: `
        <button [type]="type"
                [disabled]="disabled">
            <ng-content></ng-content>
        </button>`
})
export class SdButtonControl {
    // ----------------------------------------------
    // Input/Output
    // ----------------------------------------------

    @Input()
    @Validate({
        type: String,
        validator: (value) => ["button", "submit"].includes(value)
    })
    public type?: "button" | "submit";

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