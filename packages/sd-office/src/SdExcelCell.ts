import { SdExcelWorksheet } from "./SdExcelWorksheet";

import { SdExcelUtil } from "./utils/SdExcelUtil";
import { SdExcelCellStyle } from "./SdExcelCellStyle";
import { DateOnly, DateTime } from "@simplysm/sd-core-common";

export class SdExcelCell {
  public cellData: any;

  public get style(): SdExcelCellStyle {
    return new SdExcelCellStyle(this);
  }

  public set value(value: any) {
    if (value === undefined) {
      delete this.cellData.$.t;
      delete this.cellData.v;
    }
    else if (typeof value === "string") {
      this.cellData.$.t = "str";
      this.cellData.v = this.cellData.v ?? [];
      this.cellData.v[0] = this.cellData.v[0] ?? {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value;
      }
      else {
        this.cellData.v[0] = value;
      }
    }
    else if (typeof value === "boolean") {
      this.cellData.$.t = "b";
      this.cellData.v = this.cellData.v ?? [];
      this.cellData.v[0] = this.cellData.v[0] ?? {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value ? "1" : "0";
      }
      else {
        this.cellData.v[0] = value ? "1" : "0";
      }
    }
    else if (typeof value === "number") {
      delete this.cellData.$.t;
      if (
        this.style.numberFormat === "DateOnly"
        || this.style.numberFormat === "DateTime"
      ) {
        this.style.numberFormat = "number";
      }
      this.cellData.v = this.cellData.v ?? [];
      this.cellData.v[0] = this.cellData.v[0] ?? {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value;
      }
      else {
        this.cellData.v[0] = value;
      }
    }
    else if (value instanceof DateOnly) {
      delete this.cellData.$.t;
      this.style.numberFormat = "DateOnly";
      this.cellData.v = this.cellData.v ?? [];
      this.cellData.v[0] = this.cellData.v[0] ?? {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = SdExcelUtil.getTimeNumber(value);
      }
      else {
        this.cellData.v[0] = SdExcelUtil.getTimeNumber(value);
      }
    }
    else if (value instanceof DateTime) {
      delete this.cellData.$.t;
      this.style.numberFormat = "DateTime";
      this.cellData.v = this.cellData.v ?? [];
      this.cellData.v[0] = this.cellData.v[0] ?? {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = SdExcelUtil.getTimeNumber(value);
      }
      else {
        this.cellData.v[0] = SdExcelUtil.getTimeNumber(value);
      }
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + value);
    }
  }

  public get value(): any {
    if (this.cellData.v == null && this.cellData.$.t !== "inlineStr") {
      return undefined;
    }

    const cellV = this.cellData.v ?? this.cellData.is[0].t;
    const value = cellV[0]._ ?? cellV[0];

    if (value == null || value === "") {
      return undefined;
    }
    else if (this.cellData.$.t === "str" || this.cellData.$.t === "inlineStr") {
      return value;
    }
    else if (this.cellData.$.t === "b") {
      return Number(value) === 1;
    }
    else if (this.cellData.$.t === "s") {
      const sstIndex = Number(value);

      if (this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t !== undefined) {
        const v = this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t[0]._ ?? this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t[0];
        const realV = v?.$ !== undefined ? " " : v?.toString();
        if (realV == null || realV === "") {
          return undefined;
        }
        return realV;
      }
      else {
        const v = this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].r.map((item: any) => {
          const sub = item.t[0]._ ?? item.t[0];
          return sub?.$ !== undefined ? " " : sub?.toString();
        }).filterExists().join("");
        return v?.toString();
      }
    }
    else if (this.style.numberFormat === "string") {
      return value?.toString();
    }
    else if (this.style.numberFormat === "number") {
      return Number(value);
    }
    else if (this.style.numberFormat === "Currency") {
      return Number(value);
    }
    else if (this.style.numberFormat === "DateOnly") {
      return SdExcelUtil.getDateOnly(Number(value));
    }
    else if (this.style.numberFormat === "DateTime") {
      return SdExcelUtil.getDateTime(Number(value));
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + this.cellData.$.t + ", " + this.style.numberFormat);
    }
  }

  public set formula(value: string | undefined) {
    if (this.cellData.v?.[0]?._ !== undefined || this.cellData.v?._ !== undefined) {
      throw new Error("하나의 셀에 'value'가 지정된 상태로, 'Formula'를 지정할 수 없습니다. ('formula'를 먼저 지정하고 'value'값을 넣으세요.)");
    }

    if (value === undefined) {
      delete this.cellData.$.t;
      delete this.cellData.f;
    }
    else {
      this.cellData.$.t = "str";
      this.cellData.f = this.cellData.f ?? {};
      this.cellData.f._ = value;
    }
  }

  public get formula(): string | undefined {
    if (this.cellData.f === undefined) {
      return undefined;
    }
    else {
      return this.cellData.f[0]._ ?? this.cellData.f[0];
    }
  }

  public constructor(public readonly excelWorkSheet: SdExcelWorksheet,
                     public readonly row: number,
                     public readonly col: number) {
    this.excelWorkSheet.sheetData.worksheet.sheetData[0].row = this.excelWorkSheet.sheetData.worksheet.sheetData[0].row ?? [];
    let currRow = excelWorkSheet.rowDataMap.get(row);
    // let currRow = rowNodes.single((item: any) => Number(item.$.r) === row + 1);
    if (currRow === undefined) {
      currRow = { $: { r: row + 1 } };

      const rowNodes = this.excelWorkSheet.sheetData.worksheet.sheetData[0].row as any[];
      const beforeRow = rowNodes.orderBy((item) => Number(item.$.r)).last((item) => Number(item.$.r) < Number(currRow.$.r));
      const beforeRowIndex = beforeRow !== undefined ? rowNodes.indexOf(beforeRow) : -1;

      rowNodes.insert(beforeRowIndex + 1, currRow);
      this.excelWorkSheet.rowDataMap.set(beforeRowIndex + 1, currRow);
    }

    currRow.c = currRow.c ?? [];
    const cellNodes = currRow.c as any[];
    const cellAddr = SdExcelUtil.getAddress(this.row, this.col);
    let currCell = cellNodes.single((item: any) => item.$.r === cellAddr);
    if (currCell === undefined) {
      currCell = { $: { r: cellAddr } };

      const colStyle = this.excelWorkSheet.column(col).colData?.$?.style;
      if (colStyle !== undefined) {
        currCell.$.s = colStyle;
      }

      const beforeCell = cellNodes
        .orderBy((item) => SdExcelUtil.getAddressRowCol(item.$.r).col)
        .last((item) => SdExcelUtil.getAddressRowCol(item.$.r).col < SdExcelUtil.getAddressRowCol(currCell.$.r).col);
      const beforeCellIndex = beforeCell !== undefined ? cellNodes.indexOf(beforeCell) : -1;

      cellNodes.insert(beforeCellIndex + 1, currCell);
    }

    this.cellData = currCell;
  }

  public merge(row: number, col: number): void {
    this.excelWorkSheet.sheetData.worksheet.mergeCells = this.excelWorkSheet.sheetData.worksheet.mergeCells ?? [{}];
    this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell = this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell ?? [];

    const mergeCells = this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell;
    const prev = mergeCells.single((item: any) => {
      const mergeCellRowCol = SdExcelUtil.getRangeAddressRowCol(item.$.ref);
      return mergeCellRowCol.fromRow === this.row && mergeCellRowCol.fromCol === this.col;
    });

    if (prev !== undefined) {
      prev.$.rev = SdExcelUtil.getRangeAddress(this.row, this.col, row, col);
    }
    else {
      this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell.push({
        $: {
          ref: SdExcelUtil.getRangeAddress(this.row, this.col, row, col)
        }
      });
    }
  }

  public async drawingAsync(buffer: Buffer, ext: string, options?: { width?: number; height?: number; left?: number; top?: number }): Promise<void> {
    // Sheet Rel
    this.excelWorkSheet.relData = this.excelWorkSheet.relData ?? {};
    this.excelWorkSheet.relData.Relationships = this.excelWorkSheet.relData.Relationships ?? {};
    this.excelWorkSheet.relData.Relationships.$ = this.excelWorkSheet.relData.Relationships.$ ?? {};
    this.excelWorkSheet.relData.Relationships.$.xmlns = this.excelWorkSheet.relData.Relationships.$.xmlns ?? "http://schemas.openxmlformats.org/package/2006/relationships";
    this.excelWorkSheet.relData.Relationships.Relationship = this.excelWorkSheet.relData.Relationships.Relationship ?? [];
    const wsRels: any[] = this.excelWorkSheet.relData.Relationships.Relationship;
    const wsDrawingRel = wsRels.single((item) => (/drawing[0-9]/).test(item.$.Target));
    let wsRelId: number;
    if (wsDrawingRel !== undefined) {
      wsRelId = Number(wsDrawingRel.$.Id.replace("rId", ""));
    }
    else {
      const wsRelLastId = wsRels.max((item: any) => Number(item.$.Id.replace(/rId/, ""))) ?? 0;
      const wsRelNewId = wsRelLastId + 1;
      wsRels.push({
        $: {
          Id: "rId" + wsRelNewId,
          Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
          Target: "../drawings/drawing1.xml"
        }
      });
      wsRelId = wsRelNewId;
    }

    // Media (copy)
    const imageMaxId = this.excelWorkSheet.workbook.medias
      .filter((item) => item.name.includes("image"))
      .map((item) => Number((/\/image(.*)\./).exec(item.name)![1]))
      .max() ?? 0;

    const imageNewId = imageMaxId + 1;
    this.excelWorkSheet.workbook.medias.push({
      name: "xl/media/image" + imageNewId + "." + ext,
      buffer
    });

    // Drawing Rel
    this.excelWorkSheet.drawingRelData = this.excelWorkSheet.drawingRelData ?? {};
    this.excelWorkSheet.drawingRelData.Relationships = this.excelWorkSheet.drawingRelData.Relationships ?? {};
    this.excelWorkSheet.drawingRelData.Relationships.$ = this.excelWorkSheet.drawingRelData.Relationships.$ ?? {};
    this.excelWorkSheet.drawingRelData.Relationships.$.xmlns = this.excelWorkSheet.drawingRelData.Relationships.$.xmlns ?? "http://schemas.openxmlformats.org/package/2006/relationships";
    this.excelWorkSheet.drawingRelData.Relationships.Relationship = this.excelWorkSheet.drawingRelData.Relationships.Relationship ?? [];

    const relationshipArray: any[] = this.excelWorkSheet.drawingRelData.Relationships.Relationship;
    const maxId = relationshipArray.max((item: any) => Number(item.$["Id"].replace(/rId/, ""))) ?? 0;
    const newId = maxId + 1;
    relationshipArray.push({
      $: {
        "Id": "rId" + newId,
        "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
        "Target": `../media/image${imageNewId}.${ext}`
      }
    });

    // Drawing
    this.excelWorkSheet.drawingData = this.excelWorkSheet.drawingData ?? {};
    this.excelWorkSheet.drawingData["xdr:wsDr"] = this.excelWorkSheet.drawingData["xdr:wsDr"] ?? {};
    this.excelWorkSheet.drawingData["xdr:wsDr"].$ = this.excelWorkSheet.drawingData["xdr:wsDr"].$ ?? {};
    this.excelWorkSheet.drawingData["xdr:wsDr"].$["xmlns:xdr"] = this.excelWorkSheet.drawingData["xdr:wsDr"].$["xmlns:xdr"] ?? "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
    this.excelWorkSheet.drawingData["xdr:wsDr"].$["xmlns:a"] = this.excelWorkSheet.drawingData["xdr:wsDr"].$["xmlns:a"] ?? "http://schemas.openxmlformats.org/drawingml/2006/main";

    this.excelWorkSheet.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"] = this.excelWorkSheet.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"] ?? [];

    const anchorArray = this.excelWorkSheet.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"];

    const dataUrl = "data:image/" + ext + ";base64, " + btoa(String.fromCharCode(...Array.from(buffer)));
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = (): void => {
        resolve();
      };
      img.src = dataUrl;
    });

    anchorArray.push({
      "xdr:from": [
        {
          "xdr:col": [this.col.toString()],
          "xdr:colOff": [((options?.left ?? 0) * 9525).toString()],
          "xdr:row": [this.row.toString()],
          "xdr:rowOff": [((options?.top ?? 0) * 9525).toString()]
        }
      ],
      "xdr:ext": [
        {
          $: {
            "cx": (options?.width ?? img.width) * 9525,
            "cy": (options?.height ?? img.height) * 9525
          }
        }
      ],
      "xdr:pic": [
        {
          "xdr:nvPicPr": [
            {
              "xdr:cNvPr": [
                {
                  $: {
                    id: newId.toString(),
                    name: `Image ${imageNewId}`
                  }
                }
              ],
              "xdr:cNvPicPr": [{}]
            }
          ],
          "xdr:blipFill": [
            {
              "a:blip": [
                {
                  $: {
                    "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                    "r:embed": "rId" + newId
                  }
                }
              ],
              "a:stretch": [{}]
            }
          ],
          "xdr:spPr": [
            {
              "a:prstGeom": [
                {
                  "$": {
                    "prst": "rect"
                  }
                }
              ]
            }
          ]
        }
      ],
      "xdr:clientData": [{}]
    });

    // Content_Types
    const contentType = this.excelWorkSheet.workbook.contentTypeData.Types;
    if (!(contentType.Default.some((item: any) => item.$.Extension === ext) as boolean)) {
      contentType.Default.push({
        $: {
          Extension: ext,
          ContentType: "image/" + ext
        }
      });
    }

    if (!(contentType.Override.some((item: any) => item.$.PartName === "/xl/drawings/drawing1.xml") as boolean)) {
      contentType.Override.push({
        $: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PartName: "/xl/drawings/drawing1.xml",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ContentType: "application/vnd.openxmlformats-officedocument.drawing+xml"
        }
      });
    }

    this.excelWorkSheet.sheetData.worksheet.drawing = this.excelWorkSheet.sheetData.worksheet.drawing ?? [];
    if (!(this.excelWorkSheet.sheetData.worksheet.drawing.some((item: any) => item.$["r:id"] === "rId" + wsRelId) as boolean)) {
      this.excelWorkSheet.sheetData.worksheet.drawing.push({
        $: {
          "r:id": "rId" + wsRelId
        }
      });
    }
  }
}
