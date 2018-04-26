import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdValidate} from "../../decorators/SdValidate";

@Component({
    selector: "sd-form",
    template: `
        <form (submit)="onSubmit($event)">
            <ng-content></ng-content>
        </form>`,
    styleUrls: ["./SdFormControl.pcss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdFormControl {
    // ----------------------------------------------
    // Inputs
    // ----------------------------------------------

    @Input()
    @SdValidate(Boolean)
    @HostBinding("attr.sd-inline")
    public inline?: boolean;

    // ----------------------------------------------
    // Outputs
    // ----------------------------------------------
    @Output()
    public readonly submit = new EventEmitter<void>();

    // ----------------------------------------------
    // Events
    // ----------------------------------------------
    public onSubmit(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        this.submit.emit();
    }
}