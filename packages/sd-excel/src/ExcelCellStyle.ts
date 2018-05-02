import {
  ExcelCellStyleFontWeight,
  ExcelCellStyleTextAlign,
  ExcelCellStyleVerticalAlign,
  ExcelNumberFormat
} from "./ExcelEnums";

export class ExcelCellStyle {
  public background: string | undefined;
  public color: string | undefined;
  public textAlign: ExcelCellStyleTextAlign | undefined;
  public verticalAlign: ExcelCellStyleVerticalAlign | undefined;
  public fontWeight: ExcelCellStyleFontWeight | undefined;
  public borderColor: string | undefined;
  public wrapText: boolean | undefined;
  public numberFormat: ExcelNumberFormat = ExcelNumberFormat.Default;

  public get hasStyle(): boolean {
    return !!(this.background || this.color || this.textAlign || this.verticalAlign || this.fontWeight || this.borderColor || this.wrapText || this.numberFormat);
  }
}