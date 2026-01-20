import { NumberUtils } from "@simplysm/core-common";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelNumberFormat } from "../types";

/**
 * Excel 관련 유틸리티 함수 모음.
 * 셀 주소 변환, 날짜/숫자 변환, 숫자 형식 처리 등의 기능을 제공한다.
 */
export class ExcelUtils {
  /** 셀 좌표를 "A1" 형식 문자열로 변환 */
  static stringifyAddr(point: ExcelAddressPoint): string {
    const rowStr = this.stringifyRowAddr(point.r);
    const colStr = this.stringifyColAddr(point.c);
    return `${colStr}${rowStr}`;
  }

  static stringifyRowAddr(r: number): string {
    return (r + 1).toString();
  }

  static stringifyColAddr(c: number): string {
    if (c < 0) {
      throw new Error(`열 인덱스는 0 이상이어야 합니다: ${c}`);
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

  static parseRowAddrCode(addrCode: string): number {
    const rowAddrCode = /\d*$/.exec(addrCode)?.[0] ?? "";
    const parsed = NumberUtils.parseInt(rowAddrCode);
    if (parsed == null) {
      throw new Error(`잘못된 행 주소 코드: ${addrCode}`);
    }
    return parsed - 1;
  }

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

  static parseCellAddrCode(addr: string): ExcelAddressPoint {
    return {
      r: ExcelUtils.parseRowAddrCode(addr),
      c: ExcelUtils.parseColAddrCode(addr),
    };
  }

  static parseRangeAddrCode(rangeAddr: string): ExcelAddressRangePoint {
    const sAddr = rangeAddr.split(":")[0];
    const eAddr = rangeAddr.split(":")[1] ?? rangeAddr.split(":")[0];
    return {
      s: ExcelUtils.parseCellAddrCode(sAddr),
      e: ExcelUtils.parseCellAddrCode(eAddr),
    };
  }

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
   * JavaScript 타임스탬프(ms)를 Excel 날짜 숫자로 변환.
   * Excel은 1899-12-31을 기준(0)으로 일수를 계산한다.
   */
  static convertTimeTickToNumber(tick: number): number {
    const currDate = new Date(tick);
    currDate.setMinutes(currDate.getMinutes() - currDate.getTimezoneOffset());
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputExcelDateNumberUtc = currDate.getTime() - excelBaseDateNumberUtc;
    return inputExcelDateNumberUtc / (24 * 60 * 60 * 1000) + 1;
  }

  /**
   * Excel 날짜 숫자를 JavaScript 타임스탬프(ms)로 변환.
   * Excel은 1899-12-31을 기준(0)으로 일수를 계산한다.
   */
  static convertNumberToTimeTick(num: number): number {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (num - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.getTime();
  }

  static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat {
    if (numFmtCode === "General") {
      return "number";
    }

    const hasDate = /yy/i.test(numFmtCode) || /dd/i.test(numFmtCode) || /mm/i.test(numFmtCode);
    const hasTime = /hh/i.test(numFmtCode) || /ss/i.test(numFmtCode);

    if (hasDate && hasTime) {
      return "DateTime"; // 날짜+시간 = DateTime
    } else if (hasDate) {
      return "DateOnly"; // 날짜만 = DateOnly
    } else if (hasTime) {
      return "Time"; // 시간만 = Time
    } else if (/^[0.#,_;()\-\\$ @*?"E%+]*$/.test(numFmtCode.split("]").at(-1) ?? "")) {
      return "number";
    } else if ((numFmtCode.split("]").at(-1) ?? "").includes("#,0")) {
      return "number";
    } else {
      throw new Error(`[numFmtCode: ${numFmtCode}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat {
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
      throw new Error(`[numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number {
    if (numFmtName === "number") {
      return 0;
    } else if (numFmtName === "DateOnly") {
      return 14;
    } else if (numFmtName === "DateTime") {
      return 22;
    } else if (numFmtName === "Time") {
      return 18;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (numFmtName === "string") {
      return 49;
    } else {
      throw new Error(`'${numFmtName}'에 대한 'numFmtId'를 알 수 없습니다.`);
    }
  }
}
