import {ExcelCell} from "./ExcelCell";

export class ExcelCellStyle {
  public set alignH(value: "center" | "left" | "right") {
    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyAlignment = 1;
    newStyle.alignment = newStyle.alignment || [{}];
    newStyle.alignment[0].$ = newStyle.alignment[0].$ || {};
    newStyle.alignment[0].$.horizontal = "center";
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  public set background(value: string) {
    if (!/^[0-9A-F]{8}/.test(value.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newFill = this._createNewFill();
    newFill.patternFill = newFill.patternFill || [{}];
    newFill.patternFill[0].$ = newFill.patternFill[0].$ || {};
    newFill.patternFill[0].$.patternType = "solid";
    newFill.patternFill[0].fgColor = newFill.patternFill[0].fgColor || [{}];
    newFill.patternFill[0].fgColor[0].$ = newFill.patternFill[0].fgColor[0].$ || {};
    newFill.patternFill[0].fgColor[0].$.rgb = value.toUpperCase();
    const newFillIndex = this._setFillData(newFill);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyFill = 1;
    newStyle.$.fillId = newFillIndex;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  public set foreground(value: string) {
    if (!/^[0-9A-F]{8}/.test(value.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newFont = this._createNewFont();
    newFont.color = newFont.color || [{}];
    newFont.color[0].$ = newFont.color[0].$ || {};
    newFont.color[0].$.rgb = value;
    const newFontIndex = this._setFontData(newFont);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyFont = 1;
    newStyle.$.fontId = newFontIndex;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  public set bold(value: boolean) {
    const newFont = this._createNewFont();
    if (value) {
      newFont.b = newFont.b || [{}];
    }
    else {
      delete newFont.b;
    }
    const newFontIndex = this._setFontData(newFont);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyFont = 1;
    newStyle.$.fontId = newFontIndex;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  public set numberFormat(value: "DateOnly" | undefined) {
    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyFont = 1;
    newStyle.$.numFmtId = value === "DateOnly" ? 14 : undefined;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
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
    const fillId = (this._ec.cellData.$ && this._ec.cellData.$.s)
      ? Number(this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(this._ec.cellData.$.s)].$.fillId)
      : undefined;
    if (fillId) {
      return Object.clone(this._ec.ews.workbook.stylesData.styleSheet.fills[0].fill[fillId]);
    }
    else {
      return {};
    }
  }

  private _createNewStyle(): any {
    return (this._ec.cellData.$ && this._ec.cellData.$.s)
      ? Object.clone(this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(this._ec.cellData.$.s)])
      : {};
  }

  private _createNewFont(): any {
    const fontId = (this._ec.cellData.$ && this._ec.cellData.$.s)
      ? Number(this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(this._ec.cellData.$.s)].$.fontId)
      : undefined;

    if (fontId) {
      return Object.clone(this._ec.ews.workbook.stylesData.styleSheet.fonts[0].font[fontId]);
    }
    else {
      return {};
    }
  }

  private _createNewBorder(): any {
    const borderId = (this._ec.cellData.$ && this._ec.cellData.$.s)
      ? Number(this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf[Number(this._ec.cellData.$.s)].$.borderId)
      : undefined;

    if (borderId) {
      return Object.clone(this._ec.ews.workbook.stylesData.styleSheet.borders[0].border[borderId]);
    }
    else {
      return {};
    }
  }

  private _setBorderWidth(direction: "left" | "right" | "bottom" | "top", width: "thin" | "medium"): void {
    const newBorder = this._createNewBorder();
    newBorder[direction] = newBorder[direction] || [{}];
    newBorder[direction][0].$ = newBorder[direction][0].$ || {};
    newBorder[direction][0].$.style = width;
    const newBorderIndex = this._setBorderData(newBorder);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyBorder = 1;
    newStyle.$.borderId = newBorderIndex;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  private _setBorderColor(direction: "left" | "right" | "bottom" | "top", color: string): void {
    if (!/^[0-9A-F]{8}/.test(color.toUpperCase())) {
      throw new Error("색상 형식이 잘못되었습니다. (형식: FFFFFFFF: alpha+rgb)");
    }

    const newBorder = this._createNewBorder();
    newBorder[direction] = newBorder[direction] || [{}];
    newBorder[direction][0].color = newBorder[direction][0].color || [{}];
    newBorder[direction][0].color[0].$ = newBorder[direction][0].color[0].$ || {};
    newBorder[direction][0].color[0].$.rgb = color;
    const newBorderIndex = this._setBorderData(newBorder);

    const newStyle = this._createNewStyle();
    newStyle.$ = newStyle.$ || {};
    newStyle.$.applyBorder = 1;
    newStyle.$.borderId = newBorderIndex;
    const newIndex = this._setStyleData(newStyle);

    this._ec.cellData.$ = this._ec.cellData.$ || {};
    this._ec.cellData.$.s = newIndex;
  }

  private _setFillData(data: any): number {
    const index = this._ec.ews.workbook.stylesData.styleSheet.fills[0].fill.findIndex((item: any) => Object.equal(item, data));
    if (index >= 0) return index;
    return this._ec.ews.workbook.stylesData.styleSheet.fills[0].fill.push(data) - 1;
  }

  private _setFontData(data: any): number {
    const index = this._ec.ews.workbook.stylesData.styleSheet.fonts[0].font.findIndex((item: any) => Object.equal(item, data));
    if (index >= 0) return index;
    return this._ec.ews.workbook.stylesData.styleSheet.fonts[0].font.push(data) - 1;
  }

  private _setStyleData(data: any): number {
    const index = this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf.findIndex((item: any) => Object.equal(item, data));
    if (index >= 0) return index;
    return this._ec.ews.workbook.stylesData.styleSheet.cellXfs[0].xf.push(data) - 1;
  }

  private _setBorderData(data: any): number {
    const index = this._ec.ews.workbook.stylesData.styleSheet.borders[0].border.findIndex((item: any) => Object.equal(item, data));
    if (index >= 0) return index;
    return this._ec.ews.workbook.stylesData.styleSheet.borders[0].border.push(data) - 1;
  }

  public constructor(private readonly _ec: ExcelCell) {
  }
}