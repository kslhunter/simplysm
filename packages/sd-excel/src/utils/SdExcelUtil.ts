import { NumberUtil } from "@simplysm/sd-core-common";

export class SdExcelUtil {
  public static stringifyAddr(point: { r: number; c: number }): string {
    const rowStr = (point.r + 1).toString();
    const colStr = this.stringifyColAddr(point.c);
    return `${colStr}${rowStr}`;
  }

  public static stringifyColAddr(c: number): string {
    let remained = c;
    let result = String.fromCharCode((remained % 26) + 65);
    remained = Math.floor(remained / 26);
    while (remained !== 0) {
      result = String.fromCharCode((remained % 26) + 64) + result;
      remained = Math.floor(remained / 26);
    }
    return result;
  }

  public static parseAddr(addr: string): { r: number; c: number } {
    return {
      r: NumberUtil.parseInt((/[0-9]*$/).exec(addr)![0])! - 1,
      c: SdExcelUtil.parseColAddr((/^[a-zA-Z]*/).exec(addr)![0])
    };
  }

  public static parseColAddr(addr: string): number {
    let result = 0;
    const revAddr = Array.from(addr).reverse().join("");
    for (let i = 0; i < revAddr.length; i++) {
      const col = revAddr.charCodeAt(i) - (i === 0 ? 65 : 64);
      result += col * (26 ** i);
    }
    return result;
  }

  public static parseRangeAddr(rangeAddr: string): { s: { r: number; c: number }; e: { r: number; c: number } } {
    const sAddr = rangeAddr.split(":")[0];
    const eAddr = rangeAddr.split(":")[1] ?? rangeAddr.split(":")[0];
    return {
      s: SdExcelUtil.parseAddr(sAddr),
      e: SdExcelUtil.parseAddr(eAddr)
    };
  }

  public static stringifyRangeAddr(point: { s: { r: number; c: number }; e: { r: number; c: number } }): string {
    const sAddr = this.stringifyAddr(point.s);
    const eAddr = this.stringifyAddr(point.e);

    if (sAddr === eAddr) {
      return sAddr;
    }
    else {
      return sAddr + ":" + eAddr;
    }
  }

  public static convertDateToNumber(date: Date): number {
    const currDate = new Date(date);
    currDate.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputExcelDateNumberUtc = currDate.getTime() - excelBaseDateNumberUtc;
    return (inputExcelDateNumberUtc / (24 * 60 * 60 * 1000)) + 1;
  }

  public static convertNumberToDate(num: number): Date {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (num - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date;
  }
}
