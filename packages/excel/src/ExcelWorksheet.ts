import * as xlsx from "xlsx";
import {DateOnly, DateTime} from "@simplism/core";

export class ExcelWorksheet {
  public ws = xlsx.utils.json_to_sheet([]);

  public setData(arr: object[]): void {
    xlsx.utils.sheet_add_json(this.ws, arr.map(item => {
      const realItem = {};
      for (const key of Object.keys(item)) {
        realItem[key] = item[key] instanceof DateTime ? item[key].date
          : item[key] instanceof DateOnly ? item[key].date
            : item[key];
      }
      return realItem;
    }));
  }
}