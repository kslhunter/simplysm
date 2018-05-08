import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {DateOnly} from "@simplism/sd-core";

@Component({
  selector: "sd-date-range-picker",
  template: `
    <div>
      <sd-date-picker [value]="from"
                      (valueChange)="onFromChange($event)"></sd-date-picker>
      <span>~</span>
      <sd-date-picker [value]="to"
                      (valueChange)="onToChange($event)"></sd-date-picker>
    </div>
    <div>
      <div *ngIf="helpers && helpers.length > 0">
        :
        <ng-container *ngFor="let helper of helpers; trackBy: getTrackByFn()">
          <sd-button2 [inline]="true" (click)="onHelperClick(helper)">
            {{ helper }}
          </sd-button2>
        </ng-container>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdDateRangePickerControl}]
})
export class SdDateRangePickerControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(Array)
  public helpers?: string[];

  @Input()
  @SdTypeValidate(DateOnly)
  public from?: DateOnly;

  @Input()
  @SdTypeValidate(DateOnly)
  public to?: DateOnly;

  @Output()
  public readonly fromChange = new EventEmitter<DateOnly | undefined>();

  @Output()
  public readonly toChange = new EventEmitter<DateOnly | undefined>();

  public onFromChange(value: DateOnly | undefined): void {
    this.from = value;
    this.fromChange.emit(value);
  }

  public onToChange(value: DateOnly | undefined): void {
    this.to = value;
    this.toChange.emit(value);
  }

  public onHelperClick(helper: string): void {
    if (helper === "오늘") {
      this.from = new DateOnly();
      this.to = new DateOnly();

      this.fromChange.emit(this.from);
      this.toChange.emit(this.to);
    }
    else if (helper === "어제") {
      this.from = new DateOnly().addDates(-1);
      this.to = new DateOnly().addDates(-1);

      this.fromChange.emit(this.from);
      this.toChange.emit(this.to);
    }
    else if (helper === "이번달") {
      this.from = new DateOnly().addMonths(1).setDate(1).addMonths(-1);
      this.to = new DateOnly().addMonths(1).setDate(1).addDates(-1);

      this.fromChange.emit(this.from);
      this.toChange.emit(this.to);
    }
    else if (helper === "저번달") {
      this.from = new DateOnly().setDate(1).addMonths(-1);
      this.to = new DateOnly().setDate(1).addDates(-1);

      this.fromChange.emit(this.from);
      this.toChange.emit(this.to);
    }
  }
}
