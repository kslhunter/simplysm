import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { SdSelectControl } from "../select/sd-select.control";
import { SdSelectItemControl } from "../select/sd-select-item.control";
import { SdRangeControl } from "./sd-range.control";
import { SdTextfieldControl } from "./sd-textfield.control";
import { DateOnly } from "@simplysm/sd-core-common";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-date-range-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdSelectControl, SdSelectItemControl, SdRangeControl, SdTextfieldControl],
  host: {
    class: "flex-row gap-sm",
  },
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

  required = input(false, { transform: transformBoolean });

  handleDatePeriodTypeChanged() {
    if (this.periodType() === "월") {
      const fromDate = this.from();
      if (fromDate) {
        this.from.set(fromDate.setDay(1));
        this.to.set(fromDate.addMonths(1).setDay(1).addDays(-1));
      } else {
        this.to.set(undefined);
      }
    } else if (this.periodType() === "일") {
      this.to.set(this.from());
    }
  }

  handleFromDateChanged() {
    if (this.periodType() === "월") {
      const fromDate = this.from();
      this.to.set(fromDate?.addMonths(1).setDay(1).addDays(-1));
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
