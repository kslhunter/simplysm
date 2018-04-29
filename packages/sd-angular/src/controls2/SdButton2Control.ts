import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SizeStrings, ThemeStrings} from "../helpers/types";

@Component({
    selector: "sd-button2",
    template: `
        <button [ngClass]="classList"
                [type]="type"
                [disabled]="disabled">
            <ng-content></ng-content>
        </button>`,
    host: {
        "[attr.sd-size]": "size",
        "[attr.sd-theme]": "theme",
        "[attr.sd-inline]": "inline"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButton2Control implements OnChanges {
    //-- Input/Output
    @Input() public type?: "button" | "submit";
    @Input() public size?: SizeStrings;
    @Input() public theme?: ThemeStrings;
    @Input() public inline?: boolean;
    @Input() public disabled?: boolean;

    public ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            type: {
                type: String,
                validator: (value) => ["button", "submit"].includes(value)
            },
            size: "SizeStrings",
            theme: "ThemeStrings",
            inline: Boolean,
            disabled: Boolean
        });
    }
}