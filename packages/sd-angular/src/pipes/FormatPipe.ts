import { Pipe, PipeTransform } from "@angular/core";
import { DateOnly, DateTime } from "@simplysm/sd-core-common";

@Pipe({
  standalone: true,
  name: "format",
})
export class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string {
    if (value == null) {
      return "";
    } else if (value instanceof DateTime || value instanceof DateOnly) {
      return value.toFormatString(format);
    } else {
      const formatItems = format.split("|");

      for (const formatItem of formatItems) {
        const fullLength = formatItem.match(/X/g)?.length;
        if (fullLength === value.length) {
          let result = "";
          let valCur = 0;
          for (const formatItemChar of formatItem) {
            if (formatItemChar === "X") {
              result += value[valCur];
              valCur++;
            } else {
              result += formatItemChar;
            }
          }
          return result;
        }
      }

      return value;
    }
  }
}
