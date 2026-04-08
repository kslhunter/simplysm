import { Component, signal } from "@angular/core";
import { DateOnly } from "@simplysm/core-common";
import { SdCalendar } from "../../../src/ui/visual/sd-calendar";
import { SdItemOfTemplate } from "../../../src/core/directives/sd-item-of-template";

@Component({
  selector: "sd-calendar-basic-test",
  template: `
    <sd-calendar [yearMonth]="yearMonth()" [items]="items" [getItemDateFn]="getItemDate">
      <ng-template [itemOf]="items" let-item>
        <span class="test-item">{{ item.title }}</span>
      </ng-template>
    </sd-calendar>
  `,
  standalone: true,
  imports: [SdCalendar, SdItemOfTemplate],
})
export class SdCalendarBasicTest {
  yearMonth = signal(new DateOnly(2026, 3, 1));
  items: { title: string; date: DateOnly }[] = [
    { title: "이벤트A", date: new DateOnly(2026, 3, 15) },
  ];
  getItemDate = (item: { title: string; date: DateOnly }) => item.date;
}

@Component({
  selector: "sd-calendar-monday-start-test",
  template: `
    <sd-calendar
      [yearMonth]="yearMonth()"
      [items]="items"
      [getItemDateFn]="getItemDate"
      [weekStartDay]="1"
    >
      <ng-template [itemOf]="items" let-item>
        <span>{{ item.title }}</span>
      </ng-template>
    </sd-calendar>
  `,
  standalone: true,
  imports: [SdCalendar, SdItemOfTemplate],
})
export class SdCalendarMondayStartTest {
  yearMonth = signal(new DateOnly(2026, 3, 1));
  items: { title: string; date: DateOnly }[] = [];
  getItemDate = (item: { title: string; date: DateOnly }) => item.date;
}

@Component({
  selector: "sd-calendar-empty-test",
  template: `
    <sd-calendar [yearMonth]="yearMonth()" [items]="items" [getItemDateFn]="getItemDate">
      <ng-template [itemOf]="items" let-item>
        <span>{{ item.title }}</span>
      </ng-template>
    </sd-calendar>
  `,
  standalone: true,
  imports: [SdCalendar, SdItemOfTemplate],
})
export class SdCalendarEmptyTest {
  yearMonth = signal(new DateOnly(2026, 3, 1));
  items: { title: string; date: DateOnly }[] = [];
  getItemDate = (item: { title: string; date: DateOnly }) => item.date;
}
