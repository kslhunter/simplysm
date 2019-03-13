import {DateOnly, DateTime} from "@simplysm/sd-common";

export class SdExcelUtils {
  public static getRangeAddress(fromRow: number, fromCol: number, toRow: number, toCol: number): string {
    return `${this.getAddress(fromRow, fromCol)}:${this.getAddress(toRow, toCol)}`;
  }

  public static getAddress(row: number, col: number): string {
    const rowStr = (row + 1).toString();
    const colStr = this._getColAddress(col);
    return `${colStr}${rowStr}`;
  }

  public static getAddressRowCol(addr: string): { row: number; col: number } {
    return {
      row: Number(addr.match(/[0-9]*$/)![0]),
      col: this._getAddressCol(addr.match(/^[a-zA-Z]*/)![0])
    };
  }

  public static getTimeNumber(date: DateTime | DateOnly): number {
    const currDate = date.date;
    currDate.setMinutes(currDate.getMinutes() - currDate.getTimezoneOffset());

    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputExcelDateNumberUtc = currDate.getTime() - excelBaseDateNumberUtc;
    return inputExcelDateNumberUtc / (24 * 60 * 60 * 1000) + 1;
  }

  public static getDateOnly(excelTime: number): DateOnly {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (excelTime - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return new DateOnly(date);
  }

  public static getDateTime(excelTime: number): DateTime {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (excelTime - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return new DateTime(date);
  }

  private static _getColAddress(index: number): string {
    let remained = index;
    let result = String.fromCharCode(remained % 26 + 65);
    remained = Math.floor(remained / 26);
    while (remained !== 0) {
      result = String.fromCharCode(remained % 26 + 64) + result;
      remained = Math.floor(remained / 26);
    }
    return result;
  }

  private static _getAddressCol(addr: string): number {
    let result = 0;
    const revAddr = Array.from(addr).reverse().join("");
    for (let i = 0; i < revAddr.length; i++) {
      const col = revAddr.charCodeAt(i) - 65;
      result += col * Math.pow(26, i);
    }
    return result;
  }
}
