import type { IWorksheetModel } from "./models/i-worksheet-model";
import type { IStyleModel } from "./models/i-style-model";
import type { ISharedStringModel } from "./models/i-shared-string-model";
import type { ExcelStyle } from "./models/shared/excel-style";
import { convertExcelStyleOptions } from "./models/shared/excel-style";
import type { ZipCache } from "./utils/zip-cache";
import type { ExcelAddressPoint, ExcelStyleOptions, ExcelValueType } from "./types";
import {
  DateOnly,
  DateTime,
  num,
  str,
  Time,
} from "@simplysm/core-common";
import { ExcelUtils } from "./utils/excel-utils";
import { getOrCreateStyleData } from "./utils/excel-style-data";

/**
 * Excel 셀을 나타내는 클래스.
 * 값 읽기/쓰기, 수식, 스타일, 셀 병합 기능을 제공한다.
 *
 * @remarks
 * ## 비동기 메서드 설계
 *
 * `getValue()`, `setValue()` 등 모든 셀 메서드가 `async`인 이유:
 * - 셀 타입에 필요한 XML만 선택적으로 로드함
 * - 문자열 셀: SharedStrings.xml 로드
 * - 숫자 셀: SharedStrings 로드하지 않음
 * - 스타일 적용 셀: Styles.xml 로드
 *
 * 읽을 셀을 사전에 알 수 없으므로 동기 설계가 불가능하다.
 * 동기 설계는 모든 XML을 미리 로드해야 하므로 대용량 파일에서 메모리 문제가 발생한다.
 */
export class ExcelCell {
  /** 셀 주소 (0 기반 행/열 인덱스) */
  readonly addr: ExcelAddressPoint;

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
    private readonly _c: number,
  ) {
    this.addr = { r: this._r, c: this._c };
  }

  //#region Value Methods

  /** 셀에 수식 설정 (undefined: 수식 제거) */
  async setFormula(val: string | undefined): Promise<void> {
    if (val == null) {
      await this._deleteCell(this.addr);
    } else {
      const wsData = await this._getWsData();
      wsData.setCellType(this.addr, "str");
      wsData.setCellVal(this.addr, undefined);
      wsData.setCellFormula(this.addr, val);
    }
  }

  /** 셀 수식 반환 */
  async getFormula(): Promise<string | undefined> {
    const wsData = await this._getWsData();
    return wsData.getCellFormula(this.addr);
  }

  /** 셀 값 설정 (undefined: 셀 삭제) */
  async setValue(val: ExcelValueType): Promise<void> {
    if (val == null) {
      await this._deleteCell(this.addr);
    } else if (typeof val === "string") {
      const wsData = await this._getWsData();
      const ssData = await this._getOrCreateSsData();
      const ssId = ssData.getIdByString(val);
      if (ssId != null) {
        wsData.setCellType(this.addr, "s");
        wsData.setCellVal(this.addr, ssId.toString());
      } else {
        const newSsId = ssData.add(val);
        wsData.setCellType(this.addr, "s");
        wsData.setCellVal(this.addr, newSsId.toString());
      }
    } else if (typeof val === "boolean") {
      const wsData = await this._getWsData();
      wsData.setCellType(this.addr, "b");
      wsData.setCellVal(this.addr, val ? "1" : "0");
    } else if (typeof val === "number") {
      const wsData = await this._getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, val.toString());
    } else if (val instanceof DateOnly || val instanceof DateTime || val instanceof Time) {
      const wsData = await this._getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, ExcelUtils.convertTimeTickToNumber(val.tick).toString());

      const numFmtName =
        val instanceof DateOnly ? "DateOnly" : val instanceof DateTime ? "DateTime" : "Time";
      await this._setStyleInternal({
        numFmtId: ExcelUtils.convertNumFmtNameToId(numFmtName).toString(),
      });
    } else {
      throw new Error(
        `[${ExcelUtils.stringifyAddr(this.addr)}] 지원하지 않는 타입: ${typeof val}`,
      );
    }
  }

  /** 셀 값 반환 */
  async getValue(): Promise<ExcelValueType> {
    const wsData = await this._getWsData();
    const cellVal = wsData.getCellVal(this.addr);
    if (cellVal == null || str.isNullOrEmpty(cellVal)) {
      return undefined;
    }

    const cellType = wsData.getCellType(this.addr);
    if (cellType === "s") {
      const ssData = await this._getOrCreateSsData();
      const ssId = num.parseInt(cellVal);
      if (ssId == null) {
        throw new Error(
          `[${ExcelUtils.stringifyAddr(this.addr)}] SharedString ID 파싱 실패: ${cellVal}`,
        );
      }
      return ssData.getStringById(ssId);
    } else if (cellType === "str") {
      return cellVal;
    } else if (cellType === "inlineStr") {
      return cellVal;
    } else if (cellType === "b") {
      return cellVal === "1";
    } else if (cellType === "n") {
      return parseFloat(cellVal);
    } else if (cellType === "e") {
      throw new Error(
        `[${ExcelUtils.stringifyAddr(this.addr)}] 셀 타입 분석 실패: 셀에 에러 값이 포함되어 있음 (${cellVal})`,
      );
    } else {
      // cellType == null: 숫자 또는 날짜/시간 타입
      const cellStyleId = wsData.getCellStyleId(this.addr);
      if (cellStyleId == null) {
        return parseFloat(cellVal);
      }

      const styleData = await this._getStyleData();
      if (styleData == null) {
        return parseFloat(cellVal);
      }

      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId == null) {
        return parseFloat(cellVal);
      }

      const numFmtCode = styleData.getNumFmtCode(numFmtId);
      let numFmt;
      if (numFmtCode != null) {
        numFmt = ExcelUtils.convertNumFmtCodeToName(numFmtCode);
      } else {
        const numFmtIdNum = num.parseInt(numFmtId);
        if (numFmtIdNum == null) {
          throw new Error(
            `[${ExcelUtils.stringifyAddr(this.addr)}] numFmtId 파싱 실패: ${numFmtId}`,
          );
        }
        numFmt = ExcelUtils.convertNumFmtIdToName(numFmtIdNum);
      }

      if (numFmt === "number") {
        return parseFloat(cellVal);
      } else if (numFmt === "string") {
        return cellVal;
      } else {
        // DateOnly, DateTime, Time 타입
        const dateNum = num.parseFloat(cellVal);
        if (dateNum == null) {
          throw new Error(
            `[${ExcelUtils.stringifyAddr(this.addr)}] 날짜 숫자 파싱 실패: ${cellVal}`,
          );
        }
        const tick = ExcelUtils.convertNumberToTimeTick(dateNum);
        if (numFmt === "DateOnly") {
          return new DateOnly(tick);
        } else if (numFmt === "DateTime") {
          return new DateTime(tick);
        } else {
          return new Time(tick);
        }
      }
    }
  }

  //#endregion

  //#region Merge Methods

  /**
   * 현재 셀에서 지정된 끝 좌표까지 셀 병합
   * @param r 병합 끝 행 인덱스 (0 기반)
   * @param c 병합 끝 열 인덱스 (0 기반)
   */
  async merge(r: number, c: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setMergeCells(this.addr, { r, c });
  }

  //#endregion

  //#region Style Methods

  /** 셀 스타일 ID 반환 */
  async getStyleId(): Promise<string | undefined> {
    const wsData = await this._getWsData();
    return wsData.getCellStyleId(this.addr);
  }

  /** 셀 스타일 ID 설정 */
  async setStyleId(styleId: string | undefined): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setCellStyleId(this.addr, styleId);
  }

  /**
   * 셀 스타일 설정
   * @param opts 스타일 옵션
   * @param opts.background 배경색 (ARGB 형식, 8자리 16진수. 예: "00FF0000")
   * @param opts.border 테두리 위치 배열 (예: ["left", "right", "top", "bottom"])
   * @param opts.horizontalAlign 가로 정렬 ("left", "center", "right")
   * @param opts.verticalAlign 세로 정렬 ("top", "center", "bottom")
   * @param opts.numberFormat 숫자 형식 프리셋 ("number", "DateOnly", "DateTime", "Time", "string")
   * @param opts.numberFormatCode 커스텀 Excel formatCode (예: "0.000000"). `numberFormat`과 동시 지정 시 이 필드가 우선한다.
   * @param opts.font 폰트 (size/family/bold/italic/underline/color/strike). 미지정 속성은 워크북 default 폰트로 표시된다.
   */
  async setStyle(opts: ExcelStyleOptions): Promise<void> {
    await this._setStyleInternal(convertExcelStyleOptions(opts));
  }

  //#endregion

  //#region Private Methods

  private async _deleteCell(addr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.deleteCell(addr);
  }

  private async _getWsData(): Promise<IWorksheetModel> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as IWorksheetModel;
  }

  private async _setStyleInternal(style: ExcelStyle): Promise<void> {
    const wsData = await this._getWsData();
    const styleData = await this._getOrCreateStyleData();
    let styleId = wsData.getCellStyleId(this.addr);
    if (styleId == null) {
      styleId = styleData.add(style);
    } else {
      styleId = styleData.addWithClone(styleId, style);
    }
    wsData.setCellStyleId(this.addr, styleId);
  }

  private async _getStyleData(): Promise<IStyleModel | undefined> {
    return (await this._zipCache.get("xl/styles.xml")) as IStyleModel | undefined;
  }

  private async _getOrCreateSsData(): Promise<ISharedStringModel> {
    return this._zipCache.ensureSharedStrings();
  }

  private async _getOrCreateStyleData(): Promise<IStyleModel> {
    return getOrCreateStyleData(this._zipCache);
  }

  //#endregion
}
