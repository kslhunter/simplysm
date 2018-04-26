import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdValidate} from "../../decorators/SdValidate";

@Component({
    selector: "sd-form-item",
    template: `
        <label *ngIf="label">
            {{ label }}
        </label>
        <div>
            <ng-content></ng-content>
        </div>`,
    styleUrls: ["./SdFormItemControl.pcss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdFormItemControl {
    // ----------------------------------------------
    // Inputs
    // ----------------------------------------------

    @Input()
    @SdValidate(String)
    public label?: string;
}