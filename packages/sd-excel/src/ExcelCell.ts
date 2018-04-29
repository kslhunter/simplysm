import {ExcelCellStyle} from "./ExcelCellStyle";

export class ExcelCell {
    public value: any;
    public style: ExcelCellStyle = new ExcelCellStyle();
    public formula: string | undefined;
}