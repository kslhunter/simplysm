import {
    ExcelCellStyleFontWeight,
    ExcelCellStyleTextAlign,
    ExcelCellStyleVerticalAlign,
    ExcelNumberFormat
} from "./ExcelEnums";

export class ExcelCellStyle {
    background: string | undefined;
    color: string | undefined;
    textAlign: ExcelCellStyleTextAlign | undefined;
    verticalAlign: ExcelCellStyleVerticalAlign | undefined;
    fontWeight: ExcelCellStyleFontWeight | undefined;
    borderColor: string | undefined;
    wrapText: boolean | undefined;
    numberFormat: ExcelNumberFormat = ExcelNumberFormat.Default;

    get hasStyle(): boolean {
        return !!(this.background || this.color || this.textAlign || this.verticalAlign || this.fontWeight || this.borderColor || this.wrapText || this.numberFormat);
    }
}