import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelect } from "../select/sd-select";
import { SdSelectItem } from "../select/sd-select-item";
import { SdRange } from "./sd-range";
import { SdTextfield } from "./sd-textfield";
import { DateOnly } from "@simplysm/core-common";

@Component({
  selector: "sd-date-range-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdRange, SdTextfield],
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-date-range-picker {
        display: flex;
        align-items: center;

        @include mixins.flex-direction(row, var(--gap-sm));
      }
    `,
  ],
  template: `
    <sd-select
      [(value)]="periodType"
      (valueChange)="handleDatePeriodTypeChanged()"
      [required]="true"
      style="min-width: 0"
    >
      <sd-select-item [value]="'일'">일</sd-select-item>
      <sd-select-item [value]="'월'">월</sd-select-item>
      <sd-select-item [value]="'범위'">범위</sd-select-item>
    </sd-select>
    @if (periodType() === "범위") {
      <sd-range
        [type]="'date'"
        [(from)]="from"
        [(to)]="to"
        (fromChange)="handleFromDateChanged()"
        [required]="required()"
      />
    } @else {
      <sd-textfield
        [required]="required()"
        [type]="periodType() === '월' ? 'month' : 'date'"
        [(value)]="from"
        (valueChange)="handleFromDateChanged()"
      />
    }
  `,
})
export class SdDateRangePicker {
  periodType = model<"일" | "월" | "범위">("범위");
  from = model<DateOnly>();
  to = model<DateOnly>();

  required = input(false, { transform: booleanAttribute });

  handleDatePeriodTypeChanged(): void {
    if (this.periodType() === "월") {
      const fromDate = this.from();
      if (fromDate) {
        const firstOfMonth = fromDate.setDay(1);
        this.from.set(firstOfMonth);
        this.to.set(firstOfMonth.addMonths(1).addDays(-1));
      } else {
        this.to.set(undefined);
      }
    } else if (this.periodType() === "일") {
      this.to.set(this.from());
    }
  }

  handleFromDateChanged(): void {
    if (this.periodType() === "월") {
      const fromDate = this.from();
      if (fromDate) {
        const firstOfMonth = fromDate.setDay(1);
        this.from.set(firstOfMonth);
        this.to.set(firstOfMonth.addMonths(1).addDays(-1));
      } else {
        this.to.set(undefined);
      }
    } else if (this.periodType() === "일") {
      this.to.set(this.from());
    } else if (
      this.periodType() === "범위" &&
      this.from() &&
      this.to() &&
      this.from()!.tick > this.to()!.tick
    ) {
      this.to.set(this.from());
    }
  }
}
