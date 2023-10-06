import {SdExcelXmlWorksheet} from "./files/SdExcelXmlWorksheet";
import {DateOnly, DateTime, NumberUtil, StringUtil, Time} from "@simplysm/sd-core-common";
import {TSdExcelNumberFormat, TSdExcelValueType} from "./commons";
import {SdExcelXmlSharedString} from "./files/SdExcelXmlSharedString";
import {SdExcelZipCache} from "./utils/SdExcelZipCache";
import {SdExcelXmlContentType} from "./files/SdExcelXmlContentType";
import {SdExcelXmlRelationship} from "./files/SdExcelXmlRelationship";
import {ISdExcelStyle, SdExcelXmlStyle} from "./files/SdExcelXmlStyle";
import {SdExcelUtil} from "./utils/SdExcelUtil";

export class SdExcelCell {
  public style = {
    setBackgroundAsync: async (color: string): Promise<void> => {
      if (!(/^[0-9A-F]{8}/).test(color.toUpperCase())) {
        throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
      }

      await this._setStyleAsync({background: color});
    },
    setVerticalAlignAsync: async (align: "center" | "top" | "bottom"): Promise<void> => {
      await this._setStyleAsync({verticalAlign: align});
    },
    setHorizontalAlignAsync: async (align: "center" | "left" | "right"): Promise<void> => {
      await this._setStyleAsync({horizontalAlign: align});
    },
    setFormatPresetAsync: async (format: TSdExcelNumberFormat | "ThousandsSeparator"): Promise<void> => {
      if (format === "ThousandsSeparator") {
        await this._setStyleAsync({numFmtId: "41"});
      }
      else {
        await this._setStyleAsync({numFmtId: SdExcelUtil.convertNumFmtNameToId(format).toString()});
      }
    }
  };
  private readonly _addr: string;

  public constructor(private readonly _zipCache: SdExcelZipCache,
                     private readonly _targetFileName: string,
                     private readonly _r: number,
                     private readonly _c: number) {
    this._addr = SdExcelUtil.stringifyAddr({r: this._r, c: this._c});
  }

  public async setValAsync(val: TSdExcelValueType): Promise<void> {
    if (val === undefined) {
      await this._deleteAddrAsync(this._addr);
    }
    else if (typeof val === "string") {
      const wsData = await this._getWsDataAsync();

      const ssData = await this._getOrCreateSsDataAsync();
      const ssId = ssData.getIdByString(val);
      if (ssId !== undefined) {
        wsData.setCellType(this._addr, "s");
        wsData.setCellVal(this._addr, ssId.toString());
      }
      else {
        const newSsId = ssData.add(val);
        wsData.setCellType(this._addr, "s");
        wsData.setCellVal(this._addr, newSsId.toString());
      }
    }
    else if (typeof val === "boolean") {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this._addr, "b");
      wsData.setCellVal(this._addr, val ? "1" : "0");
    }
    else if (typeof val === "number") {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this._addr, undefined);
      wsData.setCellVal(this._addr, val.toString());
    }
    else if (val instanceof DateOnly) {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this._addr, undefined);
      wsData.setCellVal(this._addr, SdExcelUtil.convertDateToNumber(val.date).toString());

      await this._setStyleAsync({numFmtId: SdExcelUtil.convertNumFmtNameToId("DateOnly").toString()});
    }
    else if (val instanceof DateTime) {
      const wsData = await this._getWsDataAsync();
      wsData.setCellType(this._addr, undefined);
      wsData.setCellVal(this._addr, SdExcelUtil.convertDateToNumber(val.date).toString());

      await this._setStyleAsync({numFmtId: SdExcelUtil.convertNumFmtNameToId("DateTime").toString()});
    }
    // TODO: TIME차례 (18번)
    else {
      throw new Error(`[${this._addr}] 지원되지 않는 타입입니다: ${val}`);
    }
  }

  public async getValAsync(): Promise<TSdExcelValueType> {
    const wsData = await this._getWsDataAsync();
    const cellVal = wsData.getCellVal(this._addr);
    if (cellVal === undefined || StringUtil.isNullOrEmpty(cellVal)) {
      return undefined;
    }
    const cellType = wsData.getCellType(this._addr);
    if (cellType === "s") {
      const ssData = await this._getOrCreateSsDataAsync();
      return ssData.getStringById(NumberUtil.parseInt(cellVal)!);
    }
    else if (cellType === "str") {
      return cellVal;
    }
    else if (cellType === "b") {
      return cellVal === "1";
    }
    else if (cellType === "n") {
      return NumberUtil.parseFloat(cellVal);
    }
    else if (cellType === "e") {
      throw new Error(`[${this._addr}] 타입분석 실패\n- 셀 내용에서, 에러가 감지되었습니다.(${cellVal})`);
    }
    else if (cellType === undefined) {
      const cellStyleId = wsData.getCellStyleId(this._addr);
      if (cellStyleId === undefined) {
        return NumberUtil.parseFloat(cellVal);
      }

      const styleData = (await this._getStyleDataAsync())!;
      const numFmtId = styleData.get(cellStyleId).numFmtId;
      if (numFmtId === undefined) {
        throw new Error(`[${this._addr}] 타입분석 실패\n- [numFmtId: ${numFmtId}]에 대한 형식을 알 수 없습니다.`);
      }

      const numFmtCode = styleData.getNumFmtCode(numFmtId);

      const numFmt = numFmtCode !== undefined
        ? SdExcelUtil.convertNumFmtCodeToName(numFmtCode)
        : SdExcelUtil.convertNumFmtIdToName(NumberUtil.parseInt(numFmtId)!);

      if (numFmt === "number") {
        return NumberUtil.parseFloat(cellVal);
      }
      else if (numFmt === "string") {
        return cellVal;
      }
      else if (numFmt === "DateOnly") {
        const dateNum = NumberUtil.parseFloat(cellVal)!;
        const date = SdExcelUtil.convertNumberToDate(dateNum);
        return new DateOnly(date);
      }
      else if (numFmt === "DateTime") {
        const dateNum = NumberUtil.parseFloat(cellVal)!;
        const date = SdExcelUtil.convertNumberToDate(dateNum);
        return new DateTime(date);
      }
      else if (numFmt === "Time") {
        const dateNum = NumberUtil.parseFloat(cellVal)!;
        const date = SdExcelUtil.convertNumberToDate(dateNum);
        return new Time(date);
      }
      else {
        throw new Error(`[${this._addr}] 타입분석 실패 (${numFmt})`);
      }
    }
    else {
      throw new Error(`[${this._addr}] 지원되지 않는 타입입니다: ${cellType}`);
    }
  }

  public async mergeAsync(r: number, c: number): Promise<void> {
    // TODO: 기존 머지와 겹치는게 있으면 오류 처리

    const wsData = await this._getWsDataAsync();
    wsData.setMergeCells(this._addr, SdExcelUtil.stringifyAddr({r, c}));

    // 현재셀 외의 머지된 모든셀 지우기
    for (let cr = this._r + 1; cr <= r; cr++) {
      for (let cc = this._c + 1; cc <= c; cc++) {
        const addr = SdExcelUtil.stringifyAddr({r: cr, c: cc});
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

  private async _getWbRelAsync(): Promise<SdExcelXmlRelationship> {
    return await this._zipCache.getAsync("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationship;
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
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"
      );

      //-- Workbook Rel
      const wbRelData = await this._getWbRelAsync();
      wbRelData.add(
        `sharedStrings.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings`
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
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"
      );

      //-- Workbook Rel
      const wbRelData = await this._getWbRelAsync();
      wbRelData.add(
        `styles.xml`,
        `http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`
      );
    }

    return styleData;
  }

  private async _setStyleAsync(style: ISdExcelStyle): Promise<void> {
    const wsData = await this._getWsDataAsync();
    const styleData = await this._getOrCreateStyleDataAsync();
    let styleId = wsData.getCellStyleId(this._addr);
    if (styleId === undefined) {
      styleId = styleData.add(style);
    }
    else {
      styleId = styleData.addWithClone(styleId, style);
    }
    wsData.setCellStyleId(this._addr, styleId);
  }
}
