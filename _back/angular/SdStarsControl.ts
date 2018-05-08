import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {Exception} from "@simplism/sd-core";

@Component({
  selector: "sd-stars",
  template: `
    <div [ngClass]="styleClass">
      <sd-icon *ngFor="let i of [0,1,2,3,4]; trackBy: trackByFn"
               [fixedWidth]="true"
               [icon]="'star'"
               [type]="value > i ? 'solid' : 'regular'"
               (click)="setValue(i+1)"></sd-icon>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdStarsControl {
  @Output() public readonly valueChange = new EventEmitter<number>();

  public get styleClass(): string[] {
    return [
      this._size ? `_size-${this._size}` : ""
    ].filter(item => item);
  }

  private _value = 4;

  public get value(): number {
    return this._value;
  }

  @Input()
  public set value(value: number) {
    if (![1, 2, 3, 4, 5].includes(value)) {
      throw new Exception(`'sd-stars.value'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }
    this._value = value;
  }

  private _size = "default";

  @Input()
  public set size(value: string) {
    if (!["default", "lg"].includes(value)) {
      throw new Exception(`'sd-stars.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }
    this._size = value;
  }

  public setValue(value: number): void {
    this.valueChange.emit(value);
  }

  public trackByFn(index: number, value: number): number {
    return value;
  }
}
