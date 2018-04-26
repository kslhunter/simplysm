import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdSizeString, SdThemeString} from "../../commons/types";
import {SdValidate} from "../../decorators/SdValidate";

@Component({
    selector: "sd-button",
    template: `
        <button [type]="type"
                [disabled]="disabled">
            <ng-content></ng-content>
        </button>`,
    styleUrls: ["./SdButtonControl.pcss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButtonControl {
    // ----------------------------------------------
    // Input
    // ----------------------------------------------

    @Input()
    @SdValidate({
        type: String,
        validator: (value) => ["button", "submit"].includes(value),
        notnull: true
    })
    public type: "button" | "submit" = "button";

    @Input()
    @SdValidate(Boolean)
    public disabled?: boolean;

    @Input()
    @SdValidate("SdSizeString")
    @HostBinding("attr.sd-size")
    public size?: SdSizeString;

    @Input()
    @SdValidate("SdThemeString")
    @HostBinding("attr.sd-theme")
    public theme?: SdThemeString;

    @Input()
    @SdValidate(Boolean)
    @HostBinding("attr.sd-inline")
    public inline?: boolean;
}