import { numParseInt } from "@simplysm/core-common";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelNumberFormat } from "../types";

/**
 * Collection of Excel utility functions.
 * Provides cell address conversion, date/number conversion, and number format processing.
 */
export class ExcelUtils {
  /** Convert cell coordinates to "A1" format string */
  static stringifyAddr(point: ExcelAddressPoint): string {
    const rowStr = this.stringifyRowAddr(point.r);
    const colStr = this.stringifyColAddr(point.c);
    return `${colStr}${rowStr}`;
  }

  /** Convert row index (0-based) to row address string (e.g. 0 -> "1") */
  static stringifyRowAddr(r: number): string {
    return (r + 1).toString();
  }

  /** Convert column index (0-based) to column address string (e.g. 0 -> "A", 26 -> "AA") */
  static stringifyColAddr(c: number): string {
    if (c < 0 || c > 16383) {
      throw new Error(`열 인덱스는 0~16383 범위여야 합니다: ${c}`);
    }

    let remained = c;
    let result = String.fromCharCode((remained % 26) + 65);
    remained = Math.floor(remained / 26);
    while (remained !== 0) {
      result = String.fromCharCode((remained % 26) + 64) + result;
      remained = Math.floor(remained / 26);
    }
    return result;
  }

  /** Extract row index from cell address (e.g. "A3" -> 2) */
  static parseRowAddrCode(addrCode: string): number {
    const rowAddrCode = /\d*$/.exec(addrCode)?.[0] ?? "";
    const parsed = numParseInt(rowAddrCode);
    if (parsed == null) {
      throw new Error(`잘못된 행 주소 코드: ${addrCode}`);
    }
    return parsed - 1;
  }

  /** Extract column index from cell address (e.g. "B3" -> 1) */
  static parseColAddrCode(addrCode: string): number {
    const colAddrCode = /^[a-zA-Z]*/.exec(addrCode)?.[0] ?? "";

    let result = 0;
    const revAddr = Array.from(colAddrCode).reverse().join("");
    for (let i = 0; i < revAddr.length; i++) {
      const col = revAddr.charCodeAt(i) - (i === 0 ? 65 : 64);
      result += col * 26 ** i;
    }
    return result;
  }

  /** Convert cell address to coordinates (e.g. "B3" -> {r: 2, c: 1}) */
  static parseCellAddrCode(addr: string): ExcelAddressPoint {
    return {
      r: ExcelUtils.parseRowAddrCode(addr),
      c: ExcelUtils.parseColAddrCode(addr),
    };
  }

  /** Convert range address to coordinates (e.g. "A1:C3" -> {s: {r:0,c:0}, e: {r:2,c:2}}) */
  static parseRangeAddrCode(rangeAddr: string): ExcelAddressRangePoint {
    const parts = rangeAddr.split(":");
    return {
      s: ExcelUtils.parseCellAddrCode(parts[0]),
      e: ExcelUtils.parseCellAddrCode(parts[1] ?? parts[0]),
    };
  }

  /** Convert range coordinates to address string */
  static stringifyRangeAddr(point: ExcelAddressRangePoint): string {
    const sAddr = this.stringifyAddr(point.s);
    const eAddr = this.stringifyAddr(point.e);

    if (sAddr === eAddr) {
      return sAddr;
    } else {
      return sAddr + ":" + eAddr;
    }
  }

  /**
   * Convert JavaScript timestamp (ms) to Excel date number.
   * Excel counts 1900-01-01 as 1 (1899-12-30 is date 0).
   */
  static convertTimeTickToNumber(tick: number): number {
    const currDate = new Date(tick);
    currDate.setMinutes(currDate.getMinutes() - currDate.getTimezoneOffset());
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputExcelDateNumberUtc = currDate.getTime() - excelBaseDateNumberUtc;
    return inputExcelDateNumberUtc / (24 * 60 * 60 * 1000) + 1;
  }

  /**
   * Convert Excel date number to JavaScript timestamp (ms).
   * Excel counts 1900-01-01 as 1 (1899-12-30 is date 0).
   */
  static convertNumberToTimeTick(num: number): number {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (num - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.getTime();
  }

  /** Convert number format code to format name */
  static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat {
    if (numFmtCode === "General") {
      return "number";
    }

    const hasDate = /yy/i.test(numFmtCode) || /dd/i.test(numFmtCode) || /mm/i.test(numFmtCode);
    const hasTime = /hh/i.test(numFmtCode) || /ss/i.test(numFmtCode);

    if (hasDate && hasTime) {
      return "DateTime"; // date+time = DateTime
    } else if (hasDate) {
      return "DateOnly"; // date only = DateOnly
    } else if (hasTime) {
      return "Time"; // time only = Time
    }
    // Number format pattern: 0, #, decimal, thousands separator, negative separator, parentheses, currency, space, exponent, percent, etc.
    // In "[conditional format]actual format" structure, only check the actual format part (split("]").at(-1))
    else if (/^[0.#,_;()\-\\$ @*?"E%+]*$/.test(numFmtCode.split("]").at(-1) ?? "")) {
      return "number";
    } else if ((numFmtCode.split("]").at(-1) ?? "").includes("#,0")) {
      return "number";
    } else {
      throw new Error(`[numFmtCode: ${numFmtCode}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  /**
   * Convert number format ID to format name
   *
   * @remarks
   * Excel built-in format ID ranges:
   * - 0~13, 37~40, 48: number/general/currency/percent formats
   * - 14~17, 27~31, 34~36, 50~58: date formats (including localized)
   * - 22: date+time format
   * - 18~21, 32~33, 45~47: time formats
   * - 49: text format
   */
  static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat {
    // Number/general/currency/percent formats
    if (numFmtId <= 13 || (numFmtId >= 37 && numFmtId <= 40) || numFmtId === 48) {
      return "number";
    }
    // Date formats (including localized)
    else if (
      (numFmtId >= 14 && numFmtId <= 17) ||
      (numFmtId >= 27 && numFmtId <= 31) ||
      (numFmtId >= 34 && numFmtId <= 36) ||
      (numFmtId >= 50 && numFmtId <= 58)
    ) {
      return "DateOnly";
    }
    // Date+time format
    else if (numFmtId === 22) {
      return "DateTime";
    }
    // Time formats
    else if (
      (numFmtId >= 18 && numFmtId <= 21) ||
      (numFmtId >= 32 && numFmtId <= 33) ||
      (numFmtId >= 45 && numFmtId <= 47)
    ) {
      return "Time";
    }
    // Text format
    else if (numFmtId === 49) {
      return "string";
    } else {
      throw new Error(`[numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  /** Convert number format name to format ID */
  static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number {
    if (numFmtName === "number") {
      return 0;
    } else if (numFmtName === "DateOnly") {
      return 14;
    } else if (numFmtName === "DateTime") {
      return 22;
    } else if (numFmtName === "Time") {
      return 18;
    } else {
      // Last case: "string" (TypeScript verifies automatically through type narrowing)
      return 49;
    }
  }
}
