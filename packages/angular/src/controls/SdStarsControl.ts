import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {Exception} from "@simplism/core";

@Component({
    selector: "sd-stars",
    template: `
        <div [ngClass]="styleClass">
            <i class="fa-fw fa-star" [ngClass]="[value > 0 ? 'fas' : 'far']"
               (click)="setValue(1)"></i>
            <i class="fa-fw fa-star" [ngClass]="[value > 1 ? 'fas' : 'far']"
               (click)="setValue(2)"></i>
            <i class="fa-fw fa-star" [ngClass]="[value > 2 ? 'fas' : 'far']"
               (click)="setValue(3)"></i>
            <i class="fa-fw fa-star" [ngClass]="[value > 3 ? 'fas' : 'far']"
               (click)="setValue(4)"></i>
            <i class="fa-fw fa-star" [ngClass]="[value > 4 ? 'fas' : 'far']"
               (click)="setValue(5)"></i>
        </div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdStarsControl {
    private _value = 4;
    private _size = "default";

    @Input()
    set value(value: number) {
        if (![1, 2, 3, 4, 5].includes(value)) {
            throw new Exception(`'sd-stars.value'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._value = value;
    }

    @Input()
    set size(value: string) {
        if (!["default", "lg"].includes(value)) {
            throw new Exception(`'sd-stars.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._size = value;
    }

    @Output() valueChange = new EventEmitter<number>();

    get value(): number {
        return this._value;
    }

    get styleClass(): string[] {
        return [
            this._size ? "_size-" + this._size : ""
        ].filter(item => item);
    }

    setValue(value: number): void {
        this.valueChange.emit(value);
    }
}