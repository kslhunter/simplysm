import { numParseInt } from "@simplysm/core-common";
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

  /** 행 인덱스(0-based)를 행 주소 문자열로 변환 (예: 0 -> "1") */
  static stringifyRowAddr(r: number): string {
    return (r + 1).toString();
  }

  /** 열 인덱스(0-based)를 열 주소 문자열로 변환 (예: 0 -> "A", 26 -> "AA") */
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

  /** 셀 주소에서 행 인덱스 추출 (예: "A3" -> 2) */
  static parseRowAddrCode(addrCode: string): number {
    const rowAddrCode = /\d*$/.exec(addrCode)?.[0] ?? "";
    const parsed = numParseInt(rowAddrCode);
    if (parsed == null) {
      throw new Error(`잘못된 행 주소 코드: ${addrCode}`);
    }
    return parsed - 1;
  }

  /** 셀 주소에서 열 인덱스 추출 (예: "B3" -> 1) */
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

  /** 셀 주소를 좌표로 변환 (예: "B3" -> {r: 2, c: 1}) */
  static parseCellAddrCode(addr: string): ExcelAddressPoint {
    return {
      r: ExcelUtils.parseRowAddrCode(addr),
      c: ExcelUtils.parseColAddrCode(addr),
    };
  }

  /** 범위 주소를 좌표로 변환 (예: "A1:C3" -> {s: {r:0,c:0}, e: {r:2,c:2}}) */
  static parseRangeAddrCode(rangeAddr: string): ExcelAddressRangePoint {
    const parts = rangeAddr.split(":");
    return {
      s: ExcelUtils.parseCellAddrCode(parts[0]),
      e: ExcelUtils.parseCellAddrCode(parts[1] ?? parts[0]),
    };
  }

  /** 범위 좌표를 주소 문자열로 변환 */
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
   * Excel은 1900-01-01을 1로 계산한다 (1899-12-30이 날짜 0).
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
   * Excel은 1900-01-01을 1로 계산한다 (1899-12-30이 날짜 0).
   */
  static convertNumberToTimeTick(num: number): number {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (num - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.getTime();
  }

  /** 숫자 형식 코드를 형식 이름으로 변환 */
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
    }
    // 숫자 형식 패턴: 0, #, 소수점, 천단위 구분자, 음수 구분자, 괄호, 통화, 공백, 지수, 백분율 등
    // "[조건부 서식]실제형식" 구조에서 실제형식 부분만 검사 (split("]").at(-1))
    else if (/^[0.#,_;()\-\\$ @*?"E%+]*$/.test(numFmtCode.split("]").at(-1) ?? "")) {
      return "number";
    } else if ((numFmtCode.split("]").at(-1) ?? "").includes("#,0")) {
      return "number";
    } else {
      throw new Error(`[numFmtCode: ${numFmtCode}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  /**
   * 숫자 형식 ID를 형식 이름으로 변환
   *
   * @remarks
   * Excel 내장 형식 ID 범위:
   * - 0~13, 37~40, 48: 숫자/일반/통화/백분율 형식
   * - 14~17, 27~31, 34~36, 50~58: 날짜 형식 (지역화 포함)
   * - 22: 날짜+시간 형식
   * - 18~21, 32~33, 45~47: 시간 형식
   * - 49: 텍스트 형식
   */
  static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat {
    // 숫자/일반/통화/백분율 형식
    if (numFmtId <= 13 || (numFmtId >= 37 && numFmtId <= 40) || numFmtId === 48) {
      return "number";
    }
    // 날짜 형식 (지역화 포함)
    else if (
      (numFmtId >= 14 && numFmtId <= 17) ||
      (numFmtId >= 27 && numFmtId <= 31) ||
      (numFmtId >= 34 && numFmtId <= 36) ||
      (numFmtId >= 50 && numFmtId <= 58)
    ) {
      return "DateOnly";
    }
    // 날짜+시간 형식
    else if (numFmtId === 22) {
      return "DateTime";
    }
    // 시간 형식
    else if (
      (numFmtId >= 18 && numFmtId <= 21) ||
      (numFmtId >= 32 && numFmtId <= 33) ||
      (numFmtId >= 45 && numFmtId <= 47)
    ) {
      return "Time";
    }
    // 텍스트 형식
    else if (numFmtId === 49) {
      return "string";
    } else {
      throw new Error(`[numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
    }
  }

  /** 숫자 형식 이름을 형식 ID로 변환 */
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
      // 마지막 케이스: "string" (TypeScript가 타입 좁히기를 통해 자동으로 확인)
      return 49;
    }
  }
}
