import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostBinding,
    Input,
    OnChanges,
    Output,
    SimpleChanges
} from "@angular/core";
import {SdSizeString, SdThemeString} from "../helpers/types";
import {SdValidate} from "../decorators/SdValidate";

@Component({
    selector: "sd-textfield",
    template: `
        <sd-dock-container>
            <sd-pane>
                <input [type]="type === 'number' ? 'text' : type"
                       [required]="required"
                       [disabled]="disabled"
                       [attr.step]="step"
                       [attr.min]="min"
                       [attr.placeholder]="placeholder"
                       [value]="displayText"
                       (input)="onInput($event)"
                       (focus)="onFocus($event)"
                       (blur)="onBlur($event)"/>
                <div class="invalid-indicator"></div>
            </sd-pane>
            <sd-dock position="right">
                <ng-content></ng-content>
            </sd-dock>
        </sd-dock-container>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTextfieldControl implements OnChanges {
    // ----------------------------------------------
    // Inputs
    // ----------------------------------------------

    @Input()
    @SdValidate({
        type: String,
        validator: (value) => ["text", "password", "number", "date", "month", "year"].includes(value),
        notnull: true
    })
    public type: "text" | "password" | "number" | "date" | "month" | "year" = "text";

    @Input()
    @SdValidate(Boolean)
    public required?: boolean;

    @Input()
    @SdValidate(Boolean)
    public disabled?: boolean;

    @Input()
    @SdValidate(Number)
    public step?: number;

    @Input()
    @SdValidate(Number)
    public min?: number;

    @Input()
    @SdValidate(String)
    public placeholder?: string;

    @Input()
    public value?: any;

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

    // ----------------------------------------------
    // Outputs
    // ----------------------------------------------

    @Output()
    public readonly valueChange = new EventEmitter<any>();

    // ----------------------------------------------
    // Properties
    // ----------------------------------------------

    public displayText = "";
    public focused = false;

    // ----------------------------------------------
    // Events
    // ----------------------------------------------

    public ngOnChanges(changes: SimpleChanges): void {
        if (Object.keys(changes).some((key) => ["value", "type"].includes(key))) {
            this._reloadDisplayText();
        }
    }

    public onFocus(event: Event): void {
        this.focused = true;
    }

    public onBlur(event: Event): void {
        this.focused = false;
        this._reloadDisplayText();
    }

    public onInput(event: Event): void {
        const targetEl = event.target as HTMLInputElement;
        const value = targetEl.value;
        if (this.type === "number") {
            const num = Number(value.replace(",", ""));
            this.value = Number.isNaN(num) ? 0 : num;
        }
        else {
            this.value = value;
        }

        this.valueChange.emit(this.value);
    }

    // ----------------------------------------------
    // Helpers
    // ----------------------------------------------

    private _reloadDisplayText(): void {
        if (this.value != undefined && this.type === "number" && !this.focused) {
            this.displayText = this.value.toLocaleString();
            return;
        }
        else {
            this.displayText = this.value || "";
        }
    }
}