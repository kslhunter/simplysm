import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { DateOnly, DateTime, NumberUtils, StringUtils, Time } from "@simplysm/sd-core-common";
import { TSdExcelNumberFormat, TSdExcelValueType } from "./types";
import { SdExcelXmlSharedString } from "./xmls/sd-excel-xml-shared-string";
import { ZipCache } from "./utils/zip-cache";
import { SdExcelXmlContentType } from "./xmls/sd-excel-xml-content-type";
import { SdExcelXmlRelationShip } from "./xmls/sd-excel-xml-relation-ship";
import { ISdExcelStyle, SdExcelXmlStyle } from "./xmls/sd-excel-xml-style";
import { SdExcelUtils } from "./utils/sd-excel.utils";

export class SdExcelCell {
  style = {
    setBackground: (color: string) => {
      if (!(/^[0-9A-F]{8}/).test(color.toUpperCase())) {
        throw new Error("색상 형식이 잘못되었습니다. (형식: 00000000: alpha(역)+rgb)");
      }

      this.#setStyle({ background: color });
    },
    setBorder: (directions: ("left" | "right" | "top" | "bottom")[]) => {
      this.#setStyle({ border: directions });
    },
    setVerticalAlign: (align: "center" | "top" | "bottom") => {
      this.#setStyle({ verticalAlign: align });
    },
    setHorizontalAlign: (align: "center" | "left" | "right") => {
      this.#setStyle({ horizontalAlign: align });
    },
    setFormatPreset: (format: TSdExcelNumberFormat | "ThousandsSeparator") => {
      if (format === "ThousandsSeparator") {
        this.#setStyle({ numFmtId: "41" });
      }
      else {
        this.#setStyle({
          numFmtId: SdExcelUtils.convertNumFmtNameToId(format)
            .toString(),
        });
      }
    },
    setNumFormatId: (numFmtId: string) => {
      this.#setStyle({ numFmtId: numFmtId });
    },
  };

  addr: string;
  point: { r: number, c: number };

  constructor(
    private _zipCache: ZipCache,
    private _targetFileName: string,
    private _r: number,
    private _c: number,
  ) {
    this.point = { r: this._r, c: this._c };
    this.addr = SdExcelUtils.stringifyAddr(this.point);
  }

  setFormula(val: string | undefined) {
    if (val === undefined) {
      this.#deleteAddr(this.addr);
    }
    else {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, "str");
      wsData.setCellVal(this.addr, undefined);
      wsData.setCellFormula(this.addr, val);
    }
  }

  setVal(val: TSdExcelValueType) {
    if (val === undefined) {
      this.#deleteAddr(this.addr);
    }
    else if (typeof val === "string") {
      const wsData = this.#getWsData();

      const ssData = this.#getOrCreateSsData();
      const ssId = ssData.getIdByString(val);
      if (ssId !== undefined) {
        wsData.setCellType(this.addr, "s");
        wsData.setCellVal(this.addr, ssId.toString());
      }
      else {
        const newSsId = ssData.add(val);
        wsData.setCellType(this.addr, "s");
        wsData.setCellVal(this.addr, newSsId.toString());
      }
    }
    else if (typeof val === "boolean") {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, "b");
      wsData.setCellVal(this.addr, val ? "1" : "0");
    }
    else if (typeof val === "number") {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, val.toString());
    }
    else if (val instanceof DateOnly) {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      this.#setStyle({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateOnly")
          .toString(),
      });
    }
    else if (val instanceof DateTime) {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      this.#setStyle({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateTime")
          .toString(),
      });
    }
    else if (val instanceof Time) {
      const wsData = this.#getWsData();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      this.#setStyle({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("Time")
          .toString(),
      });
    }
    else {
      throw new Error(`[${this.addr}] 지원되지 않는 타입입니다: ${val}`);
    }
  }

  getVal(): TSdExcelValueType {
    const wsData = this.#getWsData();
    const cellVal = wsData.getCellVal(this.addr);
    if (cellVal === undefined || StringUtils.isNullOrEmpty(cellVal)) {
      return undefined;
    }
    const cellType = wsData.getCellType(this.addr);
    if (cellType === "s") {
      const ssData = this.#getOrCreateSsData();
      return ssData.getStringById(NumberUtils.parseInt(cellVal)!);
    }
    else if (cellType === "str") {
      return cellVal;
    }
    else if (cellType === "inlineStr") {
      return cellVal;
    }
    else if (cellType === "b") {
      return cellVal === "1";
    }
    else if (cellType === "n") {
      return NumberUtils.parseFloat(cellVal);
    }
    else if (cellType === "e") {
      throw new Error(`[${this.addr}] 타입분석 실패\n- 셀 내용에서, 에러가 감지되었습니다.(${cellVal})`);
    }
    else if (cellType === undefined) {
      const cellStyleId = wsData.getCellStyleId(this.addr);
      if (cellStyleId === undefined) {
        return NumberUtils.parseFloat(cellVal);
      }

      const styleData = this.#getStyleData()!;
      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId === undefined) {
        return NumberUtils.parseFloat(cellVal);
        // throw new Error(`[${this.addr}] 타입분석 실패\n- [numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
      }

      const numFmtCode = styleData.getNumFmtCode(numFmtId);

      const numFmt = numFmtCode !== undefined
        ? SdExcelUtils.convertNumFmtCodeToName(numFmtCode)
        : SdExcelUtils.convertNumFmtIdToName(NumberUtils.parseInt(numFmtId)!);

      if (numFmt === "number") {
        return NumberUtils.parseFloat(cellVal);
      }
      else if (numFmt === "string") {
        return cellVal;
      }
      else if (numFmt === "DateOnly") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new DateOnly(tick);
      }
      else if (numFmt === "DateTime") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new DateTime(tick);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      else if (numFmt === "Time") {
        const dateNum = NumberUtils.parseFloat(cellVal)!;
        const tick = SdExcelUtils.convertNumberToTimeTick(dateNum);
        return new Time(tick);
      }
      else {
        throw new Error(`[${this.addr}] 타입분석 실패 (${numFmt})`);
      }
    }
    else {
      throw new Error(`[${this.addr}] 지원되지 않는 타입입니다: ${cellType}`);
    }
  }

  merge(r: number, c: number) {
    const wsData = this.#getWsData();
    wsData.setMergeCells(this.addr, SdExcelUtils.stringifyAddr({ r, c }));
  }

  getStyleId() {
    const wsData = this.#getWsData();
    return wsData.getCellStyleId(this.addr);
  }

  setStyleId(styleId: string | undefined) {
    const wsData = this.#getWsData();
    wsData.setCellStyleId(this.addr, styleId);
  }

  #deleteAddr(addr: string) {
    const wsData = this.#getWsData();
    wsData.deleteCell(addr);

    // TODO: 이 셀에서만 쓰이는 Style과 SharedString도 삭제? 이 내용은 수정할때도 적용되야? 아니면 저장할때 한꺼번에 정리해야하나.. 무시해도되나..
  }

  #getWsData(): SdExcelXmlWorksheet {
    return this._zipCache.get(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }

  #setStyle(style: ISdExcelStyle) {
    const wsData = this.#getWsData();
    const styleData = this.#getOrCreateStyleData();
    let styleId = wsData.getCellStyleId(this.addr);
    if (styleId == null) {
      styleId = styleData.add(style);
    }
    else {
      styleId = styleData.addWithClone(styleId, style);
    }
    wsData.setCellStyleId(this.addr, styleId);
  }

  #getTypeData(): SdExcelXmlContentType {
    return this._zipCache.get("[Content_Types].xml") as SdExcelXmlContentType;
  }

  #getSsData(): SdExcelXmlSharedString | undefined {
    return this._zipCache.get("xl/sharedStrings.xml") as SdExcelXmlSharedString | undefined;
  }

  #getWbRelData(): SdExcelXmlRelationShip {
    return this._zipCache.get("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationShip;
  }

  #getStyleData(): SdExcelXmlStyle | undefined {
    return this._zipCache.get("xl/styles.xml") as SdExcelXmlStyle | undefined;
  }

  #getOrCreateSsData(): SdExcelXmlSharedString {
    let ssData = this.#getSsData();
    if (!ssData) {
      //-- SharedString
      ssData = new SdExcelXmlSharedString();
      this._zipCache.set("xl/sharedStrings.xml", ssData);

      //-- Content Type
      const typeData = this.#getTypeData();
      typeData.add(
        "/xl/sharedStrings.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      //-- Workbook Rel
      const wbRelData = this.#getWbRelData();
      wbRelData.add(
        `sharedStrings.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings`,
      );
    }

    return ssData;
  }

  #getOrCreateStyleData(): SdExcelXmlStyle {
    let styleData = this.#getStyleData();
    if (!styleData) {
      //-- Style
      styleData = new SdExcelXmlStyle();
      this._zipCache.set("xl/styles.xml", styleData);

      //-- Content Type
      const typeData = this.#getTypeData();
      typeData.add(
        "/xl/styles.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      //-- Workbook Rel
      const wbRelData = this.#getWbRelData();
      wbRelData.add(
        `styles.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`,
      );
    }

    return styleData;
  }
}
