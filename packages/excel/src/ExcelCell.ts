import {ExcelCellStyle} from "./ExcelCellStyle";

export class ExcelCell {
    value: any;
    style: ExcelCellStyle = new ExcelCellStyle();
    formula: string | undefined;
}