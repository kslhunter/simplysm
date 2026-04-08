import { Component, signal } from "@angular/core";
import { DateOnly } from "@simplysm/core-common";
import { SdRange } from "../../../../src/ui/form/input/sd-range";

@Component({
  selector: "sd-range-number-test",
  template: `<sd-range [type]="'number'" [(from)]="from" [(to)]="to" />`,
  standalone: true,
  imports: [SdRange],
})
export class SdRangeNumberTest {
  from = signal<number | undefined>(undefined);
  to = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-range-date-test",
  template: `<sd-range [type]="'date'" [(from)]="from" [(to)]="to" />`,
  standalone: true,
  imports: [SdRange],
})
export class SdRangeDateTest {
  from = signal<DateOnly | undefined>(undefined);
  to = signal<DateOnly | undefined>(undefined);
}

@Component({
  selector: "sd-range-disabled-test",
  template: `<sd-range [type]="'number'" [(from)]="from" [(to)]="to" [disabled]="true" />`,
  standalone: true,
  imports: [SdRange],
})
export class SdRangeDisabledTest {
  from = signal<number | undefined>(undefined);
  to = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-range-required-test",
  template: `<sd-range [type]="'number'" [(from)]="from" [(to)]="to" [required]="true" />`,
  standalone: true,
  imports: [SdRange],
})
export class SdRangeRequiredTest {
  from = signal<number | undefined>(undefined);
  to = signal<number | undefined>(undefined);
}
