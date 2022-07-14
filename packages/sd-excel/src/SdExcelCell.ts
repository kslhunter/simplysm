import { SdExcelXmlWorksheet } from "./files/SdExcelXmlWorksheet";
import { DateOnly, DateTime, NumberUtil, StringUtil } from "@simplysm/sd-core-common";
import { TSdExcelValueType } from "./commons";
import { SdExcelXmlWorkbook } from "./files/SdExcelXmlWorkbook";
import { SdExcelXmlSharedString } from "./files/SdExcelXmlSharedString";
import { SdExcelZipCache } from "./utils/SdExcelZipCache";
import { SdExcelXmlContentType } from "./files/SdExcelXmlContentType";
import { SdExcelXmlRelationship } from "./files/SdExcelXmlRelationship";
import { SdExcelXmlStyle } from "./files/SdExcelXmlStyle";
import { SdExcelUtil } from "./utils/SdExcelUtil";

export class SdExcelCell {
  public constructor(private readonly _zipCache: SdExcelZipCache,
                     private readonly _wsRelId: number,
                     private readonly _r: number,
                     private readonly _c: number) {
  }

  public async setValAsync(val: TSdExcelValueType): Promise<void> {
    if (val === undefined) {
      const wsData = await this._getWsDataAsync();
      wsData.deleteCellData({ r: this._r, c: this._c });

      // TODO: 이 셀에서만 쓰이는 스타일도 삭제?
    }
    else if (typeof val === "string") {
      const wsData = await this._getWsDataAsync();
      const data = wsData.getOrCreateCellData({ r: this._r, c: this._c });

      data.$.t = "s";

      const ssData = await this._getOrCreateSsDataAsync();
      const ssId = ssData.getIdByString(val);
      if (ssId !== undefined) {
        data.v = [ssId.toString()];
      }
      else {
        const newSsId = ssData.add(val);
        data.v = [newSsId.toString()];
      }
    }
    else if (typeof val === "boolean") {
      const wsData = await this._getWsDataAsync();
      const data = wsData.getOrCreateCellData({ r: this._r, c: this._c });

      data.$.t = "b";
      data.v = [val ? "1" : "0"];
    }
    else if (typeof val === "number") {
      const wsData = await this._getWsDataAsync();
      const data = wsData.getOrCreateCellData({ r: this._r, c: this._c });

      delete data.$.t;

      data.v = [val.toString()];
    }
    else if (val instanceof DateOnly) {
      const wsData = await this._getWsDataAsync();
      const data = wsData.getOrCreateCellData({ r: this._r, c: this._c });

      delete data.$.t;

      data.v = [SdExcelUtil.convertDateToNumber(val.date).toString()];

      const styleData = await this._getOrCreateStyleDataAsync();
      if (data.$.s === undefined) {
        data.$.s = styleData.add({ valueType: "DateOnly" });
      }
      else {
        data.$.s = styleData.addWithClone(data.$.s, { valueType: "DateOnly" });
      }
    }
    else if (val instanceof DateTime) {
      const wsData = await this._getWsDataAsync();
      const data = wsData.getOrCreateCellData({ r: this._r, c: this._c });

      delete data.$.t;

      data.v = [SdExcelUtil.convertDateToNumber(val.date).toString()];

      const styleData = await this._getOrCreateStyleDataAsync();
      if (data.$.s === undefined) {
        data.$.s = styleData.add({ valueType: "DateTime" });
      }
      else {
        data.$.s = styleData.addWithClone(data.$.s, { valueType: "DateTime" });
      }
    }
    // TODO: TIME차례
    else {
      throw new Error("지원되지 않는 타입입니다: " + val);
    }
  }

  public async getValAsync(): Promise<TSdExcelValueType> {
    const wsData = await this._getWsDataAsync();
    const data = wsData.getCellData({ r: this._r, c: this._c });
    if (data === undefined || data.v === undefined || StringUtil.isNullOrEmpty(data.v[0])) {
      return undefined;
    }
    else if (data.$.t === "s") {
      const ssData = await this._getOrCreateSsDataAsync();
      return ssData.getStringById(NumberUtil.parseInt(data.v[0])!);
    }
    else if (data.$.t === "b") {
      return data.v[0] === "1";
    }
    else if (data.$.t === undefined) {
      if (data.$.s === undefined) {
        return NumberUtil.parseFloat(data.v[0]);
      }

      const styleData = (await this._getStyleDataAsync())!;
      const valueType = styleData.get(data.$.s).valueType;
      if (valueType === "number") {
        return NumberUtil.parseFloat(data.v[0]);
      }
      else if (valueType === "string") {
        return data.v[0];
      }
      else if (valueType === "DateOnly") {
        const dateNum = NumberUtil.parseFloat(data.v[0])!;
        const date = SdExcelUtil.convertNumberToDate(dateNum);
        return new DateOnly(date);
      }
      else if (valueType === "DateTime") {
        const dateNum = NumberUtil.parseFloat(data.v[0])!;
        const date = SdExcelUtil.convertNumberToDate(dateNum);
        return new DateTime(date);
      }
      else {
        throw new Error(`[${this._r}, ${this._c}]타입분석 실패`);
      }
    }
    else {
      const wbData = await this._getWbDataAsync();
      throw new Error(`지원되지 않는 타입입니다: ${wbData.getWorksheetNameById(this._wsRelId)}[${data.$.r}] - ${data.$.t}`);
    }
  }

  private async _getWsDataAsync(): Promise<SdExcelXmlWorksheet> {
    return await this._zipCache.getAsync(`xl/worksheets/sheet${this._wsRelId}.xml`) as SdExcelXmlWorksheet;
  }

  private async _getWbDataAsync(): Promise<SdExcelXmlWorkbook> {
    return await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
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
}
