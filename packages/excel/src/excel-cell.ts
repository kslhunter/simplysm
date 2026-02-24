import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import type { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import type { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import type { ExcelXmlStyle, ExcelStyle } from "./xml/excel-xml-style";
import type { ExcelXmlSharedString } from "./xml/excel-xml-shared-string";
import type { ZipCache } from "./utils/zip-cache";
import type { ExcelAddressPoint, ExcelStyleOptions, ExcelValueType } from "./types";
import {
  DateOnly,
  DateTime,
  numParseFloat,
  numParseInt,
  strIsNullOrEmpty,
  Time,
} from "@simplysm/core-common";
import { ExcelXmlSharedString as ExcelXmlSharedStringClass } from "./xml/excel-xml-shared-string";
import { ExcelXmlStyle as ExcelXmlStyleClass } from "./xml/excel-xml-style";
import { ExcelUtils } from "./utils/excel-utils";

/**
 * Class representing an Excel cell.
 * Provides value read/write, formula, style, and cell merge functionality.
 *
 * @remarks
 * ## Async Method Design
 *
 * Why all cell methods like `getVal()`, `setVal()` are `async`:
 * - Only the XML needed for the cell type is selectively loaded
 * - String cell: loads SharedStrings.xml
 * - Number cell: does not load SharedStrings
 * - Styled cell: loads Styles.xml
 *
 * Since the cell to be read cannot be known in advance, a synchronous design is not feasible.
 * A synchronous design would require preloading all XML, causing memory issues with large files.
 */
export class ExcelCell {
  /** Cell address (0-based row/column index) */
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

  /** Set formula on cell (undefined: remove formula) */
  async setFormula(val: string | undefined): Promise<void> {
    if (val === undefined) {
      await this._deleteCell(this.addr);
    } else {
      const wsData = await this._getWsData();
      wsData.setCellType(this.addr, "str");
      wsData.setCellVal(this.addr, undefined);
      wsData.setCellFormula(this.addr, val);
    }
  }

  /** Return cell formula */
  async getFormula(): Promise<string | undefined> {
    const wsData = await this._getWsData();
    return wsData.getCellFormula(this.addr);
  }

  /** Set cell value (undefined: delete cell) */
  async setVal(val: ExcelValueType): Promise<void> {
    if (val === undefined) {
      await this._deleteCell(this.addr);
    } else if (typeof val === "string") {
      const wsData = await this._getWsData();
      const ssData = await this._getOrCreateSsData();
      const ssId = ssData.getIdByString(val);
      if (ssId !== undefined) {
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
        `[${ExcelUtils.stringifyAddr(this.addr)}] 지원되지 않는 타입입니다: ${typeof val}`,
      );
    }
  }

  /** Return cell value */
  async getVal(): Promise<ExcelValueType> {
    const wsData = await this._getWsData();
    const cellVal = wsData.getCellVal(this.addr);
    if (cellVal === undefined || strIsNullOrEmpty(cellVal)) {
      return undefined;
    }

    const cellType = wsData.getCellType(this.addr);
    if (cellType === "s") {
      const ssData = await this._getOrCreateSsData();
      const ssId = numParseInt(cellVal);
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
        `[${ExcelUtils.stringifyAddr(this.addr)}] 셀 타입 분석 실패: 셀에 에러 값이 포함되어 있습니다 (${cellVal})`,
      );
    } else {
      // cellType === undefined: number or date/time type
      const cellStyleId = wsData.getCellStyleId(this.addr);
      if (cellStyleId === undefined) {
        return parseFloat(cellVal);
      }

      const styleData = await this._getStyleData();
      if (styleData == null) {
        return parseFloat(cellVal);
      }

      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId === undefined) {
        return parseFloat(cellVal);
      }

      const numFmtCode = styleData.getNumFmtCode(numFmtId);
      let numFmt;
      if (numFmtCode !== undefined) {
        numFmt = ExcelUtils.convertNumFmtCodeToName(numFmtCode);
      } else {
        const numFmtIdNum = numParseInt(numFmtId);
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
        // DateOnly, DateTime, Time
        const dateNum = numParseFloat(cellVal);
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
   * Merge cells from current cell to the specified end coordinates
   * @param r End row index of merge (0-based)
   * @param c End column index of merge (0-based)
   * @example
   * // Called from cell A1, merges range A1:C3 (3 rows x 3 columns)
   * await ws.cell(0, 0).merge(2, 2);
   */
  async merge(r: number, c: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setMergeCells(this.addr, { r, c });
  }

  //#endregion

  //#region Style Methods

  /** Return cell style ID */
  async getStyleId(): Promise<string | undefined> {
    const wsData = await this._getWsData();
    return wsData.getCellStyleId(this.addr);
  }

  /** Set cell style ID */
  async setStyleId(styleId: string | undefined): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setCellStyleId(this.addr, styleId);
  }

  /**
   * Set cell style
   * @param opts Style options
   * @param opts.background Background color (ARGB format, 8-digit hex. e.g. "FFFF0000")
   * @param opts.border Border position array (e.g. ["left", "right", "top", "bottom"])
   * @param opts.horizontalAlign Horizontal alignment ("left", "center", "right")
   * @param opts.verticalAlign Vertical alignment ("top", "center", "bottom")
   * @param opts.numberFormat Number format ("number", "DateOnly", "DateTime", "Time", "string")
   */
  async setStyle(opts: ExcelStyleOptions): Promise<void> {
    const style: ExcelStyle = {};

    if (opts.background != null) {
      if (!/^[0-9A-F]{8}$/i.test(opts.background)) {
        throw new Error("색상 형식이 잘못되었습니다. (형식: 00000000: alpha(역)+rgb)");
      }
      style.background = opts.background;
    }

    if (opts.border != null) {
      style.border = opts.border;
    }

    if (opts.horizontalAlign != null) {
      style.horizontalAlign = opts.horizontalAlign;
    }

    if (opts.verticalAlign != null) {
      style.verticalAlign = opts.verticalAlign;
    }

    if (opts.numberFormat != null) {
      style.numFmtId = ExcelUtils.convertNumFmtNameToId(opts.numberFormat).toString();
    }

    await this._setStyleInternal(style);
  }

  //#endregion

  //#region Private Methods

  private async _deleteCell(addr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.deleteCell(addr);
  }

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as ExcelXmlWorksheet;
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

  private async _getTypeData(): Promise<ExcelXmlContentType> {
    return (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
  }

  private async _getSsData(): Promise<ExcelXmlSharedString | undefined> {
    return (await this._zipCache.get("xl/sharedStrings.xml")) as ExcelXmlSharedString | undefined;
  }

  private async _getWbRelData(): Promise<ExcelXmlRelationship> {
    return (await this._zipCache.get("xl/_rels/workbook.xml.rels")) as ExcelXmlRelationship;
  }

  private async _getStyleData(): Promise<ExcelXmlStyle | undefined> {
    return (await this._zipCache.get("xl/styles.xml")) as ExcelXmlStyle | undefined;
  }

  private async _getOrCreateSsData(): Promise<ExcelXmlSharedString> {
    let ssData = await this._getSsData();
    if (ssData == null) {
      ssData = new ExcelXmlSharedStringClass();
      this._zipCache.set("xl/sharedStrings.xml", ssData);

      const typeData = await this._getTypeData();
      typeData.add(
        "/xl/sharedStrings.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      const wbRelData = await this._getWbRelData();
      wbRelData.add(
        "sharedStrings.xml",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
      );
    }
    return ssData;
  }

  private async _getOrCreateStyleData(): Promise<ExcelXmlStyle> {
    let styleData = await this._getStyleData();
    if (styleData == null) {
      styleData = new ExcelXmlStyleClass();
      this._zipCache.set("xl/styles.xml", styleData);

      const typeData = await this._getTypeData();
      typeData.add(
        "/xl/styles.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      const wbRelData = await this._getWbRelData();
      wbRelData.add(
        "styles.xml",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
      );
    }
    return styleData;
  }

  //#endregion
}
