import { NumberUtils } from "@simplysm/sd-core-common";
import type { TSdExcelNumberFormat } from "../types";

export class SdExcelUtils {
  static stringifyAddr(point: { r: number; c: number }): string {
    const rowStr = this.stringifyRowAddr(point.r);
    const colStr = this.stringifyColAddr(point.c);
    return `${colStr}${rowStr}`;
  }

  static stringifyRowAddr(r: number) {
    return (r + 1).toString();
  }

  static stringifyColAddr(c: number): string {
    let remained = c;
    let result = String.fromCharCode((remained % 26) + 65);
    remained = Math.floor(remained / 26);
    while (remained !== 0) {
      result = String.fromCharCode((remained % 26) + 64) + result;
      remained = Math.floor(remained / 26);
    }
    return result;
  }

  static parseRowAddrCode(addrCode: string): number {
    const rowAddrCode = /\d*$/.exec(addrCode)![0];
    return NumberUtils.parseInt(rowAddrCode)! - 1;
  }

  static parseColAddrCode(addrCode: string): number {
    const colAddrCode = /^[a-zA-Z]*/.exec(addrCode)![0];

    let result = 0;
    const revAddr = Array.from(colAddrCode).reverse().join("");
    for (let i = 0; i < revAddr.length; i++) {
      const col = revAddr.charCodeAt(i) - (i === 0 ? 65 : 64);
      result += col * 26 ** i;
    }
    return result;
  }

  static parseCellAddrCode(addr: string): { r: number; c: number } {
    return {
      r: SdExcelUtils.parseRowAddrCode(addr),
      c: SdExcelUtils.parseColAddrCode(addr),
    };
  }

  static parseRangeAddrCode(rangeAddr: string): {
    s: { r: number; c: number };
    e: { r: number; c: number };
  } {
    const sAddr = rangeAddr.split(":")[0];
    const eAddr = rangeAddr.split(":")[1] ?? rangeAddr.split(":")[0];
    return {
      s: SdExcelUtils.parseCellAddrCode(sAddr),
      e: SdExcelUtils.parseCellAddrCode(eAddr),
    };
  }

  static stringifyRangeAddr(point: {
    s: { r: number; c: number };
    e: { r: number; c: number };
  }): string {
    const sAddr = this.stringifyAddr(point.s);
    const eAddr = this.stringifyAddr(point.e);

    if (sAddr === eAddr) {
      return sAddr;
    } else {
      return sAddr + ":" + eAddr;
    }
  }

  static convertTimeTickToNumber(tick: number): number {
    const currDate = new Date(tick);
    currDate.setMinutes(currDate.getMinutes() - currDate.getTimezoneOffset());
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputExcelDateNumberUtc = currDate.getTime() - excelBaseDateNumberUtc;
    return inputExcelDateNumberUtc / (24 * 60 * 60 * 1000) + 1;
  }

  static convertNumberToTimeTick(num: number): number {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (num - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.getTime();
  }

  static convertNumFmtCodeToName(numFmtCode: string): TSdExcelNumberFormat {
    if (numFmtCode === "General") {
      return "number";
    } else if (
      (/yy/i.test(numFmtCode) || /dd/i.test(numFmtCode)) &&
      (/hh/i.test(numFmtCode) || /ss/i.test(numFmtCode))
    ) {
      return "DateOnly";
    } else if (/yy/i.test(numFmtCode) || /dd/i.test(numFmtCode)) {
      return "DateTime";
    } else if (/^[0.#,_;()\-\\$ @*?"]*$/.test(numFmtCode.split("]").last()!)) {
      return "number";
    } else if (numFmtCode.split("]").last()!.includes("#,0")) {
      return "number";
    } else {
      /*else if (numFmtCode.includes("0_")) {
      return "number";
    }
    else if (numFmtCode.includes("0_")) {
      return "number";
    }
    else if (numFmtCode.includes("##0")) {
      return "number";
    }*/
      throw new Error("[numFmtCode: " + numFmtCode + "]에 대한 형식을 알 수 없습니다.");
    }
  }

  static convertNumFmtIdToName(numFmtId: number): TSdExcelNumberFormat {
    if (numFmtId <= 13 || (numFmtId >= 37 && numFmtId <= 40) || numFmtId === 48) {
      return "number";
    } else if (
      (numFmtId >= 14 && numFmtId <= 17) ||
      (numFmtId >= 27 && numFmtId <= 31) ||
      (numFmtId >= 34 && numFmtId <= 36) ||
      (numFmtId >= 50 && numFmtId <= 58)
    ) {
      return "DateOnly";
    } else if (numFmtId === 22) {
      return "DateTime";
    } else if (
      (numFmtId >= 18 && numFmtId <= 21) ||
      (numFmtId >= 32 && numFmtId <= 33) ||
      (numFmtId >= 45 && numFmtId <= 47)
    ) {
      return "Time";
    } else if (numFmtId === 49) {
      return "string";
    } else {
      throw new Error("[numFmtId: " + numFmtId + "]에 대한 형식을 알 수 없습니다.");
    }
  }

  static convertNumFmtNameToId(numFmtName: TSdExcelNumberFormat | undefined): number {
    if (numFmtName === "number") {
      return 0;
    } else if (numFmtName === "DateOnly") {
      return 14;
    } else if (numFmtName === "DateTime") {
      return 22;
    } else if (numFmtName === "Time") {
      return 18;
    } else if (numFmtName === "string") {
      return 49;
    } else {
      throw new Error("'" + numFmtName + "'에 대한 'numFmtId'를 알 수 없습니다.");
    }
  }
}
