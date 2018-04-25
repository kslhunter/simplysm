import {Component, HostBinding, Input} from "@angular/core";
import {SizeStrings, ThemeStrings} from "../commons/types";
import {Validate} from "../decorators/Validate";

@Component({
    selector: "sd-button",
    template: `
        <button [type]="type"
                [disbled]="disabled">
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
    @Validate("SizeStrings")
    @HostBinding("attr.sd-size")
    public size?: SizeStrings;

    @Input()
    @Validate("ThemeStrings")
    @HostBinding("attr.sd-theme")
    public theme?: ThemeStrings;

    @Input()
    @Validate(Boolean)
    @HostBinding("attr.sd-inline")
    public inline?: boolean;

    @Input()
    @Validate(Boolean)
    public disabled?: boolean;
}