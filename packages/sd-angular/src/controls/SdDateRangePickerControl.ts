import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {Exception} from "../../../sd-core/src/exceptions/Exception";
import {DateOnly} from "../../../sd-core/src/types/DateOnly";

@Component({
  selector: "sd-date-range-picker",
  template: `
    <div class="_control">
      <sd-date-picker [value]="value[0]"
                      (valueChange)="onValueChange(0, $event)"></sd-date-picker>
      <span>~</span>
      <sd-date-picker [value]="value[1]"
                      (valueChange)="onValueChange(1, $event)"></sd-date-picker>
    </div>
    <div class="_helpers" *ngIf="helpers && helpers.length > 0">
      &nbsp;:
      <ng-container *ngFor="let helper of helpers; trackBy: helperTrackByFn">
        <sd-button2 [inline]="true" (click)="onHelperClick(helper)">
          {{ helper }}
        </sd-button2>
        &nbsp;
      </ng-container>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDateRangePickerControl {
  @Input() public helpers?: string[];
  @Output() public readonly valueChange = new EventEmitter<(DateOnly | undefined)[]>();

  private _value: (DateOnly | undefined)[] = [];

  public get value(): (DateOnly | undefined)[] {
    return this._value || [];
  }

  @Input()
  public set value(value: (DateOnly | undefined)[]) {
    if (!(value instanceof Array && value.length <= 2)) {
      throw new Exception(`'sd-date-range-picker.value'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }
    this._value = value;
  }

  public helperTrackByFn(index: number, value: string): string {
    return value;
  }

  public onValueChange(index: number, value: DateOnly | undefined): void {
    const result: (DateOnly | undefined)[] = [this._value[0], this._value[1]];
    result[index] = value;
    this.valueChange.emit(result);
  }

  public onHelperClick(helper: string): void {
    if (helper === "오늘") {
      this.value = [new DateOnly(), new DateOnly()];
      this.valueChange.emit(this.value);
    }
    else if (helper === "어제") {
      this.value = [new DateOnly().addDates(-1), new DateOnly().addDates(-1)];
      this.valueChange.emit(this.value);
    }
    else if (helper === "이번달") {
      this.value = [new DateOnly().addMonths(1).setDate(1).addMonths(-1), new DateOnly().addMonths(1).setDate(1).addDates(-1)];
      this.valueChange.emit(this.value);
    }
    else if (helper === "저번달") {
      this.value = [new DateOnly().setDate(1).addMonths(-1), new DateOnly().setDate(1).addDates(-1)];
      this.valueChange.emit(this.value);
    }
  }
}
