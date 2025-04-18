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
  public style = {
    setBackgroundAsync: async (color: string): Promise<void> => {
      if (!(/^[0-9A-F]{8}/).test(color.toUpperCase())) {
        throw new Error("색상 형식이 잘못되었습니다. (형식: 00000000: alpha(역)+rgb)");
      }

      await this._setStyleAsync({ background: color });
    },
    setBorderAsync: async (directions: ("left" | "right" | "top" | "bottom")[]): Promise<void> => {
      await this._setStyleAsync({ border: directions });
    },
    setVerticalAlignAsync: async (align: "center" | "top" | "bottom"): Promise<void> => {
      await this._setStyleAsync({ verticalAlign: align });
    },
    setHorizontalAlignAsync: async (align: "center" | "left" | "right"): Promise<void> => {
      await this._setStyleAsync({ horizontalAlign: align });
    },
    setFormatPresetAsync: async (format: TSdExcelNumberFormat | "ThousandsSeparator"): Promise<void> => {
      if (format === "ThousandsSeparator") {
        await this._setStyleAsync({ numFmtId: "41" });
      }
      else {
        await this._setStyleAsync({
          numFmtId: SdExcelUtils.convertNumFmtNameToId(format)
            .toString(),
        });
      }
    },
    setNumFormatIdAsync: async (numFmtId: string): Promise<void> => {
      await this._setStyleAsync({ numFmtId: numFmtId });
    },
  };

  public readonly addr: string;
  public readonly point: { r: number, c: number };

  public constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
    private readonly _c: number,
  ) {
    this.point = { r: this._r, c: this._c };
    this.addr = SdExcelUtils.stringifyAddr(this.point);
  }

  public async setFormulaAsync(val: string | undefined): Promise<void> {
    if (val === undefined) {
      await this._deleteAddrAsync(this.addr);
    }
    else {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, "str");
      wsData.setCellVal(this.addr, undefined);
      wsData.setCellFormula(this.addr, val);
    }
  }

  public async setValAsync(val: TSdExcelValueType): Promise<void> {
    if (val === undefined) {
      await this._deleteAddrAsync(this.addr);
    }
    else if (typeof val === "string") {
      const wsData = await this._getWsDataAsync();

      const ssData = await this._getOrCreateSsDataAsync();
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
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, "b");
      wsData.setCellVal(this.addr, val ? "1" : "0");
    }
    else if (typeof val === "number") {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, val.toString());
    }
    else if (val instanceof DateOnly) {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this._setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateOnly")
          .toString(),
      });
    }
    else if (val instanceof DateTime) {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this._setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("DateTime")
          .toString(),
      });
    }
    else if (val instanceof Time) {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this.addr, undefined);
      wsData.setCellVal(this.addr, SdExcelUtils.convertTimeTickToNumber(val.tick).toString());

      await this._setStyleAsync({
        numFmtId: SdExcelUtils.convertNumFmtNameToId("Time")
          .toString(),
      });
    }
    else {
      throw new Error(`[${this.addr}] 지원되지 않는 타입입니다: ${val}`);
    }
  }

  public async getValAsync(): Promise<TSdExcelValueType> {
    const wsData = await this._getWsDataAsync();
    const cellVal = wsData.getCellVal(this.addr);
    if (cellVal === undefined || StringUtils.isNullOrEmpty(cellVal)) {
      return undefined;
    }
    const cellType = wsData.getCellType(this.addr);
    if (cellType === "s") {
      const ssData = await this._getOrCreateSsDataAsync();
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

      const styleData = (await this._getStyleDataAsync())!;
      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId === undefined) {
        throw new Error(`[${this.addr}] 타입분석 실패\n- [numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
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

  public async mergeAsync(r: number, c: number): Promise<void> {
    // TODO: 기존 머지와 겹치는게 있으면 오류 처리

    const wsData = await this._getWsDataAsync();
    wsData.setMergeCells(this.addr, SdExcelUtils.stringifyAddr({ r, c }));

    // 현재셀 외의 머지된 모든셀 지우기
    for (let cr = this._r + 1; cr <= r; cr++) {
      for (let cc = this._c + 1; cc <= c; cc++) {
        const addr = SdExcelUtils.stringifyAddr({ r: cr, c: cc });
        await this._deleteAddrAsync(addr);
      }
    }
  }

  private async _deleteAddrAsync(addr: string): Promise<void> {
    const wsData = await this._getWsDataAsync();
    wsData.deleteCell(addr);

    // TODO: 이 셀에서만 쓰이는 Style과 SharedString도 삭제? 이 내용은 수정할때도 적용되야? 아니면 저장할때 한꺼번에 정리해야하나.. 무시해도되나..
  }

  private async _getWsDataAsync(): Promise<SdExcelXmlWorksheet> {
    return await this._zipCache.getAsync(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }

  private async _getTypeDataAsync(): Promise<SdExcelXmlContentType> {
    return await this._zipCache.getAsync("[Content_Types].xml") as SdExcelXmlContentType;
  }

  private async _getSsDataAsync(): Promise<SdExcelXmlSharedString | undefined> {
    return await this._zipCache.getAsync("xl/sharedStrings.xml") as SdExcelXmlSharedString | undefined;
  }

  private async _getWbRelAsync(): Promise<SdExcelXmlRelationShip> {
    return await this._zipCache.getAsync("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationShip;
  }

  private async _getStyleDataAsync(): Promise<SdExcelXmlStyle | undefined> {
    return await this._zipCache.getAsync("xl/styles.xml") as SdExcelXmlStyle | undefined;
  }

  private async _getOrCreateSsDataAsync(): Promise<SdExcelXmlSharedString> {
    let ssData = await this._getSsDataAsync();
    if (!ssData) {
      //-- SharedString
      ssData = new SdExcelXmlSharedString();
      this._zipCache.set("xl/sharedStrings.xml", ssData);

      //-- Content Type
      const typeData = await this._getTypeDataAsync();
      typeData.add(
        "/xl/sharedStrings.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      //-- Workbook Rel
      const wbRelData = await this._getWbRelAsync();
      wbRelData.add(
        `sharedStrings.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings`,
      );
    }

    return ssData;
  }

  private async _getOrCreateStyleDataAsync(): Promise<SdExcelXmlStyle> {
    let styleData = await this._getStyleDataAsync();
    if (!styleData) {
      //-- Style
      styleData = new SdExcelXmlStyle();
      this._zipCache.set("xl/styles.xml", styleData);

      //-- Content Type
      const typeData = await this._getTypeDataAsync();
      typeData.add(
        "/xl/styles.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      //-- Workbook Rel
      const wbRelData = await this._getWbRelAsync();
      wbRelData.add(
        `styles.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`,
      );
    }

    return styleData;
  }

  private async _setStyleAsync(style: ISdExcelStyle): Promise<void> {
    const wsData = await this._getWsDataAsync();
    const styleData = await this._getOrCreateStyleDataAsync();
    let styleId = wsData.getCellStyleId(this.addr);
    if (styleId === undefined) {
      styleId = styleData.add(style);
    }
    else {
      styleId = styleData.addWithClone(styleId, style);
    }
    wsData.setCellStyleId(this.addr, styleId);
  }

  async getStyleIdAsync() {
    const wsData = await this._getWsDataAsync();
    return wsData.getCellStyleId(this.addr);
  }

  async setStyleIdAsync(styleId: string) {
    const wsData = await this._getWsDataAsync();
    wsData.setCellStyleId(this.addr, styleId);
  }
}
