import { SdExcelXmlWorksheet } from "./xmls/SdExcelXmlWorksheet";
import { DateOnly, DateTime, NumberUtils, StringUtils, Time } from "@simplysm/sd-core-common";
import { TSdExcelNumberFormat, TSdExcelValueType } from "./types";
import { SdExcelXmlSharedString } from "./xmls/SdExcelXmlSharedString";
import { ZipCache } from "./utils/ZipCache";
import { SdExcelXmlContentType } from "./xmls/SdExcelXmlContentType";
import { SdExcelXmlRelationShip } from "./xmls/SdExcelXmlRelationShip";
import { ISdExcelStyle, SdExcelXmlStyle } from "./xmls/SdExcelXmlStyle";
import { SdExcelUtils } from "./utils/SdExcelUtils";

export class SdExcelCell {
  style = {
    setBackgroundAsync: async (color: string) => {
      if (!/^[0-9A-F]{8}/.test(color.toUpperCase())) {
        throw new Error("색상 형식이 잘못되었습니다. (형식: 00000000: alpha(역)+rgb)");
      }

      await this.#setStyleAsync({ background: color });
    },
    setBorderAsync: async (directions: ("left" | "right" | "top" | "bottom")[]) => {
      await this.#setStyleAsync({ border: directions });
    },
    setVerticalAlignAsync: async (align: "center" | "top" | "bottom") => {
      await this.#setStyleAsync({ verticalAlign: align });
    },
    setHorizontalAlignAsync: async (align: "center" | "left" | "right") => {
      await this.#setStyleAsync({ horizontalAlign: align });
    },
    setFormatPresetAsync: async (
      format: TSdExcelNumberFormat | "ThousandsSeparator" | "0%" | "0.00%",
    ) => {
      if (format === "ThousandsSeparator") {
        await this.#setStyleAsync({ numFmtId: "41" });
      } else if (format === "0%") {
        await this.#setStyleAsync({ numFmtId: "9" });
      } else if (format === "0.00%") {
        await this.#setStyleAsync({ numFmtId: "10" });
      } else {
        await this.#setStyleAsync({
          numFmtId: SdExcelUtils.convertNumFmtNameToId(format).toString(),
        });
      }
    },
    setNumFormatIdAsync: async (numFmtId: string) => {
      await this.#setStyleAsync({ numFmtId: numFmtId });
    },
  };

  addr: { r: number; c: number };

  constructor(
    private _zipCache: ZipCache,
    private _targetFileName: string,
    private _r: number,
    private _c: number,
  ) {
    this.addr = { r: this._r, c: this._c };
  }

  async setFormulaAsync(val: string | undefined) {
    if (val === undefined) {
      await this.#deleteCellAsync(this.addr);
    } else {
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, "str");
      wsData.setCellVal(this.addr, undefined);
      wsData.setCellFormula(this.addr, val);
    }
  }

  async setValAsync(val: TSdExcelValueType) {
    if (val === undefined) {
      await this.#deleteCellAsync(this.addr);
    } else if (typeof val === "string") {
      const wsData = await this.#getWsDataAsync();

      const ssData = await this.#getOrCreateSsDataAsync();
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
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, "b");
      wsData.setCellVal(this.addr, val ? "1" : "0");
    } else if (typeof val === "number") {
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, val.toString());
    } else if (val instanceof DateOnly) {
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this.#setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateOnly").toString(),
      });
    } else if (val instanceof DateTime) {
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this.#setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateTime").toString(),
      });
    } else if (val instanceof Time) {
      const wsData = await this.#getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this.#setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("Time").toString(),
      });
    } else {
      throw new Error(`[${this.addr}] 지원되지 않는 타입입니다: ${val}`);
    }
  }

  async getValAsync(): Promise<TSdExcelValueType> {
    const wsData = await this.#getWsDataAsync();
    const cellVal = wsData.getCellVal(this.addr);
    if (cellVal === undefined || StringUtils.isNullOrEmpty(cellVal)) {
      return undefined;
    }
    const cellType = wsData.getCellType(this.addr);
    if (cellType === "s") {
      const ssData = await this.#getOrCreateSsDataAsync();
      return ssData.getStringById(NumberUtils.parseInt(cellVal)!);
    } else if (cellType === "str") {
      return cellVal;
    } else if (cellType === "inlineStr") {
      return cellVal;
    } else if (cellType === "b") {
      return cellVal === "1";
    } else if (cellType === "n") {
      return NumberUtils.parseFloat(cellVal);
    } else if (cellType === "e") {
      throw new Error(
        `[${this.addr}] 타입분석 실패\n- 셀 내용에서, 에러가 감지되었습니다.(${cellVal})`,
      );
    } else if (cellType === undefined) {
      const cellStyleId = wsData.getCellStyleId(this.addr);
      if (cellStyleId === undefined) {
        return NumberUtils.parseFloat(cellVal);
      }

      const styleData = (await this.#getStyleDataAsync())!;
      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId === undefined) {
        return NumberUtils.parseFloat(cellVal);
        // throw new Error(`[${this.addr}] 타입분석 실패\n- [numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
      }

      const numFmtCode = styleData.getNumFmtCode(numFmtId);

      const numFmt =
        numFmtCode !== undefined
          ? SdExcelUtils.convertNumFmtCodeToName(numFmtCode)
          : SdExcelUtils.convertNumFmtIdToName(NumberUtils.parseInt(numFmtId)!);

      if (numFmt === "number") {
        return NumberUtils.parseFloat(cellVal);
      } else if (numFmt === "string") {
        return cellVal;
      } else if (numFmt === "DateOnly") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new DateOnly(tick);
      } else if (numFmt === "DateTime") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new DateTime(tick);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      else if (numFmt === "Time") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new Time(tick);
      } else {
        throw new Error(`[${this.addr}] 타입분석 실패 (${numFmt})`);
      }
    } else {
      throw new Error(`[${this.addr}] 지원되지 않는 타입입니다: ${cellType}`);
    }
  }

  async mergeAsync(r: number, c: number) {
    const wsData = await this.#getWsDataAsync();
    wsData.setMergeCells(this.addr, { r, c });
  }

  async getStyleIdAsync() {
    const wsData = await this.#getWsDataAsync();
    return wsData.getCellStyleId(this.addr);
  }

  async setStyleIdAsync(styleId: string | undefined) {
    const wsData = await this.#getWsDataAsync();
    wsData.setCellStyleId(this.addr, styleId);
  }

  async #deleteCellAsync(addr: { r: number; c: number }) {
    const wsData = await this.#getWsDataAsync();
    wsData.deleteCell(addr);

    // TODO: 이 셀에서만 쓰이는 Style과 SharedString도 삭제? 이 내용은 수정할때도 적용되야? 아니면 저장할때 한꺼번에 정리해야하나.. 무시해도되나..
  }

  async #getWsDataAsync() {
    return (await this._zipCache.getAsync(
      `xl/worksheets/${this._targetFileName}`,
    )) as SdExcelXmlWorksheet;
  }

  async #setStyleAsync(style: ISdExcelStyle) {
    const wsData = await this.#getWsDataAsync();
    const styleData = await this.#getOrCreateStyleDataAsync();
    let styleId = wsData.getCellStyleId(this.addr);
    if (styleId == null) {
      styleId = styleData.add(style);
    } else {
      styleId = styleData.addWithClone(styleId, style);
    }
    wsData.setCellStyleId(this.addr, styleId);
  }

  async #getTypeDataAsync() {
    return (await this._zipCache.getAsync("[Content_Types].xml")) as SdExcelXmlContentType;
  }

  async #getSsDataAsync() {
    return (await this._zipCache.getAsync("xl/sharedStrings.xml")) as
      | SdExcelXmlSharedString
      | undefined;
  }

  async #getWbRelDataAsync() {
    return (await this._zipCache.getAsync("xl/_rels/workbook.xml.rels")) as SdExcelXmlRelationShip;
  }

  async #getStyleDataAsync() {
    return (await this._zipCache.getAsync("xl/styles.xml")) as SdExcelXmlStyle | undefined;
  }

  async #getOrCreateSsDataAsync(): Promise<SdExcelXmlSharedString> {
    let ssData = await this.#getSsDataAsync();
    if (!ssData) {
      //-- SharedString
      ssData = new SdExcelXmlSharedString();
      this._zipCache.set("xl/sharedStrings.xml", ssData);

      //-- Content Type
      const typeData = await this.#getTypeDataAsync();
      typeData.add(
        "/xl/sharedStrings.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      //-- Workbook Rel
      const wbRelData = await this.#getWbRelDataAsync();
      wbRelData.add(
        `sharedStrings.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings`,
      );
    }

    return ssData;
  }

  async #getOrCreateStyleDataAsync(): Promise<SdExcelXmlStyle> {
    let styleData = await this.#getStyleDataAsync();
    if (!styleData) {
      //-- Style
      styleData = new SdExcelXmlStyle();
      this._zipCache.set("xl/styles.xml", styleData);

      //-- Content Type
      const typeData = await this.#getTypeDataAsync();
      typeData.add(
        "/xl/styles.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      //-- Workbook Rel
      const wbRelData = await this.#getWbRelDataAsync();
      wbRelData.add(
        `styles.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`,
      );
    }

    return styleData;
  }
}
