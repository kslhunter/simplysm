import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { DateOnly } from "@simplysm/core-common";
import { FormatPipe } from "../../core/format.pipe";
import {
  type SdItemOfTemplateContext,
  SdItemOfTemplate,
} from "../../core/template/sd-item-of-template";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "sd-calendar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FormatPipe, NgTemplateOutlet],
  template: `
    <table>
      <thead>
        <tr>
          <th>
            {{ weeks[weekStartDay() % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 1) % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 2) % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 3) % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 4) % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 5) % 7] }}
          </th>
          <th>
            {{ weeks[(weekStartDay() + 6) % 7] }}
          </th>
        </tr>
      </thead>
      <tbody>
        @for (row of dataTable(); let r = $index; track r) {
          <tr>
            @for (data of row; let c = $index; track c) {
              <td [class.not-current]="data.date.month !== yearMonth().month">
                <div class="day">
                  {{ data.date | format: "d" }}
                </div>
                <div class="content">
                  @for (item of data.items; track $index) {
                    <ng-template
                      [ngTemplateOutlet]="itemTplRef()"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: r * 7 + c,
                        depth: 0,
                      }"
                    ></ng-template>
                  }
                </div>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-calendar {
        > table {
          border-collapse: collapse;
          width: 100%;
          height: 100%;
          border-radius: var(--border-radius-default);
          overflow: hidden;

          > * > tr > * {
            padding: var(--gap-sm) var(--gap-default);
            border: 1px solid var(--theme-gray-light);

            width: calc(100% / 7);
          }

          > thead > tr > th {
            background: var(--theme-gray-lighter);
            height: 10%;
          }

          > tbody > tr > td {
            vertical-align: top;
            height: 15%;

            > .day {
              margin-bottom: var(--gap-sm);
            }

            &.not-current {
              background: var(--theme-gray-lightest);

              > .day {
                color: var(--theme-gray-default);
              }
            }

            > .content {
              display: flex;
              flex-wrap: nowrap;

              @include mixins.flex-direction(column, var(--gap-sm));
            }
          }
        }
      }
    `,
  ],
})
export class SdCalendar<T> {
  items = input.required<T[]>();
  getItemDateFn = input.required<(item: T, index: number) => DateOnly>();

  yearMonth = input(new DateOnly().setDay(1));

  itemTplRef = contentChild.required<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplate,
    { read: TemplateRef },
  );

  weekStartDay = input(0);
  minDaysInFirstWeek = input(1);

  weeks = ["일", "월", "화", "수", "목", "금", "토"];

  dataTable = computed(() => {
    const result: {
      date: DateOnly;
      items: T[];
    }[][] = [];

    // Build a Map<tick, T[]> once for O(1) lookup per cell
    const itemsByTick = new Map<number, T[]>();
    const getDateFn = this.getItemDateFn();
    for (let i = 0; i < this.items().length; i++) {
      const item = this.items()[i];
      const tick = getDateFn(item, i).tick;
      const arr = itemsByTick.get(tick);
      if (arr !== undefined) {
        arr.push(item);
      } else {
        itemsByTick.set(tick, [item]);
      }
    }

    const firstDate = this.yearMonth().getWeekSeqStartDate(
      this.weekStartDay(),
      this.minDaysInFirstWeek(),
    );
    for (let r = 0; r < 6; r++) {
      const row: {
        date: DateOnly;
        items: T[];
      }[] = [];
      for (let c = 0; c < 7; c++) {
        const date = firstDate.addDays(r * 7 + c);
        row.push({
          date,
          items: itemsByTick.get(date.tick) ?? [],
        });
      }
      result.push(row);
    }

    return result;
  });
}
