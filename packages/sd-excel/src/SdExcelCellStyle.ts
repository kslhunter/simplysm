import {SdExcelCell} from "./SdExcelCell";
import {ObjectUtils} from "@simplysm/sd-core-common";

export class SdExcelCellStyle {
  public set alignH(value: "center" | "left" | "right") {
    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyAlignment = 1;
    newStyle.alignment = newStyle.alignment ?? [{}];
    newStyle.alignment[0].$ = newStyle.alignment[0].$ ?? {};
    newStyle.alignment[0].$.horizontal = "center";
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public set alignV(value: "center" | "top" | "bottom") {
    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyAlignment = 1;
    newStyle.alignment = newStyle.alignment ?? [{}];
    newStyle.alignment[0].$ = newStyle.alignment[0].$ ?? {};
    newStyle.alignment[0].$.vertical = "center";
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public set background(value: string) {

    if (!(/^[0-9A-F]{8}/).test(value.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newFill = this._createNewFill();
    newFill.patternFill = newFill.patternFill ?? [{}];
    newFill.patternFill[0].$ = newFill.patternFill[0].$ ?? {};
    newFill.patternFill[0].$.patternType = "solid";
    newFill.patternFill[0].fgColor = newFill.patternFill[0].fgColor ?? [{}];
    newFill.patternFill[0].fgColor[0].$ = newFill.patternFill[0].fgColor[0].$ ?? {};
    newFill.patternFill[0].fgColor[0].$.rgb = value.toUpperCase();
    const newFillIndex = this._setFillData(newFill);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyFill = 1;
    newStyle.$.fillId = newFillIndex;
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public set foreground(value: string) {
    if (!(/^[0-9A-F]{8}/).test(value.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newFont = this._createNewFont();
    newFont.color = newFont.color ?? [{}];
    newFont.color[0].$ = newFont.color[0].$ ?? {};
    newFont.color[0].$.rgb = value;
    const newFontIndex = this._setFontData(newFont);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyFont = 1;
    newStyle.$.fontId = newFontIndex;
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public set bold(value: boolean) {
    const newFont = this._createNewFont();
    if (value) {
      newFont.b = newFont.b ?? [{}];
    }
    else {
      delete newFont.b;
    }
    const newFontIndex = this._setFontData(newFont);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyFont = 1;
    newStyle.$.fontId = newFontIndex;
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public get numberFormat(): string {
    const styleData = this._getStyleData();
    if (styleData?.$?.numFmtId === undefined || styleData.$.numFmtId === "0") {
      return "number";
    }
    else if (styleData.$.numFmtId === "14") {
      return "DateOnly";
    }
    else if (styleData.$.numFmtId === "22") {
      return "DateTime";
    }
    else if (styleData.$.numFmtId === "42") {
      return "Currency";
    }
    else if (styleData.$.numFmtId === "49") {
      return "string";
    }
    else {
      const numFmtData = this._getNumFmtData();
      if (
        Boolean(numFmtData?.$?.formatCode?.includes("yy")) &&
        Boolean(numFmtData?.$?.formatCode?.includes("mm")) &&
        Boolean(numFmtData?.$?.formatCode?.includes("dd")) &&
        Boolean(numFmtData?.$?.formatCode?.includes("hh"))
      ) {
        return "DateTime";
      }
      else if (
        Boolean(numFmtData?.$?.formatCode?.includes("yy")) &&
        Boolean(numFmtData?.$?.formatCode?.includes("mm")) &&
        Boolean(numFmtData?.$?.formatCode?.includes("dd"))
      ) {
        return "DateOnly";
      }

      return "number";
    }
  }

  public set numberFormat(value: string) {
    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyFont = 1;
    if (value === "number") {
      delete newStyle.$.numFmtId;
    }
    else if (value === "DateOnly") {
      newStyle.$.numFmtId = 14;
    }
    else if (value === "DateOnlySlash") {
      newStyle.$.numFmtId = 55;
    }
    else if (value === "DateTime") {
      newStyle.$.numFmtId = 22;
    }
    else if (value === "Currency") {
      newStyle.$.numFmtId = 42;
    }
    else {
      const newNumFmt = this._createNewNumFmt();
      newNumFmt.$ = newNumFmt.$ ?? {};
      newNumFmt.$.formatCode = value;
      this._setNumFmtData(newNumFmt);

      newStyle.$.numFmtId = newNumFmt.$.numFmtId;
    }

    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  public set borderLeftWidth(value: "thin" | "medium") {
    this._setBorderWidth("left", value);
  }

  public set borderLeftColor(value: string) {
    this._setBorderColor("left", value);
  }

  public set borderRightWidth(value: "thin" | "medium") {
    this._setBorderWidth("right", value);
  }

  public set borderRightColor(value: string) {
    this._setBorderColor("right", value);
  }

  public set borderTopWidth(value: "thin" | "medium") {
    this._setBorderWidth("top", value);
  }

  public set borderTopColor(value: string) {
    this._setBorderColor("top", value);
  }

  public set borderBottomWidth(value: "thin" | "medium") {
    this._setBorderWidth("bottom", value);
  }

  public set borderBottomColor(value: string) {
    this._setBorderColor("bottom", value);
  }

  public set borderWidth(value: "thin" | "medium") {
    this.borderLeftWidth = value;
    this.borderRightWidth = value;
    this.borderTopWidth = value;
    this.borderBottomWidth = value;
  }

  public set borderColor(value: string) {
    this.borderLeftColor = value;
    this.borderRightColor = value;
    this.borderTopColor = value;
    this.borderBottomColor = value;
  }

  private _createNewFill(): any {
    const styleData = this._getStyleData();
    const fillId = (styleData?.$ !== undefined) ? Number(styleData.$.fillId) : undefined;
    if (fillId !== undefined) {
      return ObjectUtils.clone(this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fills[0].fill[fillId]);
    }
    else {
      return {};
    }
  }

  private _createNewStyle(): any {
    const styleData = this._getStyleData();
    return (styleData?.$ !== undefined) ? ObjectUtils.clone(styleData) : {};
  }

  private _createNewFont(): any {
    const styleData = this._getStyleData();
    const fontId = (styleData?.$ !== undefined) ? Number(styleData.$.fontId) : undefined;

    if (fontId !== undefined) {
      return ObjectUtils.clone(this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fonts[0].font[fontId]);
    }
    else {
      return {};
    }
  }

  private _createNewBorder(): any {
    const styleData = this._getStyleData();
    const borderId = (styleData?.$ !== undefined) ? Number(styleData.$.borderId) : undefined;

    if (borderId !== undefined) {
      return ObjectUtils.clone(this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.borders[0].border[borderId]);
    }
    else {
      return {};
    }
  }

  private _createNewNumFmt(): any {
    const styleData = this._getStyleData();
    const numFmtId = (styleData?.$ !== undefined) ? Number(styleData.$.numFmtId) : undefined;

    let lastNumFmtId = (this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts[0].numFmt as any[]).max((item: any) => Number(item.$.numFmtId));
    lastNumFmtId = Math.max(lastNumFmtId ?? 0, 175);

    let newItem: any;
    if (numFmtId !== undefined) {
      const prevNumFormat = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts[0].numFmt.single((item: any) => item.$.numFmtId === numFmtId);
      if (prevNumFormat !== undefined) {
        newItem = ObjectUtils.clone(prevNumFormat);
      }
      else {
        newItem = {};
      }
    }
    else {
      newItem = {};
    }
    newItem.$ = newItem.$ ?? {};
    newItem.$.numFmtId = lastNumFmtId + 1;
    return newItem;
  }

  private _setBorderWidth(direction: "left" | "right" | "bottom" | "top", width: "thin" | "medium"): void {
    const newBorder = this._createNewBorder();
    newBorder[direction] = newBorder[direction] ?? [{}];
    newBorder[direction][0].$ = newBorder[direction][0].$ ?? {};
    newBorder[direction][0].$.style = width;
    const newBorderIndex = this._setBorderData(newBorder);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyBorder = 1;
    newStyle.$.borderId = newBorderIndex;
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  private _setBorderColor(direction: "left" | "right" | "bottom" | "top", color: string): void {
    if (!(/^[0-9A-F]{8}/).test(color.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newBorder = this._createNewBorder();
    newBorder[direction] = newBorder[direction] ?? [{}];
    newBorder[direction][0].color = newBorder[direction][0].color ?? [{}];
    newBorder[direction][0].color[0].$ = newBorder[direction][0].color[0].$ ?? {};
    newBorder[direction][0].color[0].$.rgb = color;
    const newBorderIndex = this._setBorderData(newBorder);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ ?? {};
    newStyle.$.applyBorder = 1;
    newStyle.$.borderId = newBorderIndex;
    const newIndex = this._setStyleData(newStyle);

    this._excelCell.cellData.$ = this._excelCell.cellData.$ ?? {};
    this._excelCell.cellData.$.s = newIndex;
  }

  private _setFillData(data: any): number {
    const index = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fills[0].fill.findIndex((item: any) => ObjectUtils.equal(item, data));
    if (index >= 0) return index;
    return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fills[0].fill.push(data) - 1;
  }

  private _setFontData(data: any): number {
    const index = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fonts[0].font.findIndex((item: any) => ObjectUtils.equal(item, data));
    if (index >= 0) return index;
    return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.fonts[0].font.push(data) - 1;
  }

  private _setNumFmtData(data: any): number {
    const index = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts[0].numFmt.findIndex((item: any) => ObjectUtils.equal(item, data));
    if (index >= 0) return index;
    return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts[0].numFmt.push(data) - 1;
  }

  private _setStyleData(data: any): number {
    const index = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.cellXfs[0].xf.findIndex((item: any) => ObjectUtils.equal(item, data));
    if (index >= 0) return index;
    return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.cellXfs[0].xf.push(data) - 1;
  }

  private _getStyleData(): any {
    if (this._excelCell.cellData.$?.s !== undefined) {
      return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(this._excelCell.cellData.$.s)];
    }

    const colData = this._excelCell.excelWorkSheet.column(this._excelCell.col).colData;
    if (colData.$?.style !== undefined) {
      return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(colData.$.style)];
    }

    return undefined;
  }

  private _getNumFmtData(): any {
    const styleData = this._getStyleData();
    if (styleData.$.numFmtId !== undefined) {
      if (this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts === undefined) {
        return undefined;
      }
      else {
        return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.numFmts[0].numFmt.single((item: any) => item.$.numFmtId === styleData.$.numFmtId);
      }
    }

    return undefined;
  }

  private _setBorderData(data: any): number {
    const index = this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.borders[0].border.findIndex((item: any) => ObjectUtils.equal(item, data));
    if (index >= 0) return index;
    return this._excelCell.excelWorkSheet.workbook.stylesData.styleSheet.borders[0].border.push(data) - 1;
  }

  public constructor(private readonly _excelCell: SdExcelCell) {
  }
}