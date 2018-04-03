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

    @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();

    @Input()
    get value(): string {
        return this._value;
    }

    set value(value: string) {
        if (!value) {
            value = "";
        }
        this._value = value;
    }

    @Input() placeholder = "";
    @Input() rows = 3;
    @Input() disabled = false;

    @Input()
    set style(value: string) {
        const styles = value.split(";");
        for (const style of styles) {
            if (style.includes(":")) {
                const name = style.split(":")[0];
                this._style[name] = style.split(":")[1];
            }
        }
    }

    getStyle(): { [key: string]: any } {
        return this._style;
    }

    private _style: { [key: string]: any } = {};

    onChange(e: Event): void {
        const targetElem = e.target as HTMLInputElement;
        this.valueChange.emit(targetElem.value);
    }
}