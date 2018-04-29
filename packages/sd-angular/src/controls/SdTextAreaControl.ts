import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "sd-text-area",
    template: `<textarea [placeholder]="placeholder"
                         [value]="value"
                         (change)="onChange($event)"
                         [rows]="rows"
                         [ngStyle]="getStyle()"
                         [disabled]="disabled"></textarea>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTextAreaControl {
    private _value = "";

    @Output() public readonly valueChange: EventEmitter<string> = new EventEmitter<string>();

    @Input()
    public get value(): string {
        return this._value;
    }

    public set value(value: string) {
        if (!value) {
            value = "";
        }
        this._value = value;
    }

    @Input() public placeholder = "";
    @Input() public rows = 3;
    @Input() public disabled = false;

    @Input()
    public set style(value: string) {
        const styles = value.split(";");
        for (const style of styles) {
            if (style.includes(":")) {
                const name = style.split(":")[0];
                this._style[name] = style.split(":")[1];
            }
        }
    }

    public getStyle(): { [key: string]: any } {
        return this._style;
    }

    private _style: { [key: string]: any } = {};

    public onChange(e: Event): void {
        const targetElem = e.target as HTMLInputElement;
        this.valueChange.emit(targetElem.value);
    }
}