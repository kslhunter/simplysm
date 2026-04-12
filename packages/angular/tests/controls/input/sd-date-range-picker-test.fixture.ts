import { Component, signal } from "@angular/core";
import { DateOnly } from "@simplysm/core-common";
import { SdDateRangePicker } from "../../../src/controls/input/sd-date-range.picker";

@Component({
  selector: "sd-date-range-picker-default-test",
  template: `
    <sd-date-range-picker
      [(periodType)]="periodType"
      [(from)]="from"
      [(to)]="to"
    />
  `,
  standalone: true,
  imports: [SdDateRangePicker],
})
export class SdDateRangePickerDefaultTest {
  periodType = signal<"일" | "월" | "범위">("범위");
  from = signal<DateOnly | undefined>(undefined);
  to = signal<DateOnly | undefined>(undefined);
}

@Component({
  selector: "sd-date-range-picker-required-test",
  template: `
    <sd-date-range-picker
      [(periodType)]="periodType"
      [(from)]="from"
      [(to)]="to"
      [required]="true"
    />
  `,
  standalone: true,
  imports: [SdDateRangePicker],
})
export class SdDateRangePickerRequiredTest {
  periodType = signal<"일" | "월" | "범위">("범위");
  from = signal<DateOnly | undefined>(undefined);
  to = signal<DateOnly | undefined>(undefined);
}
