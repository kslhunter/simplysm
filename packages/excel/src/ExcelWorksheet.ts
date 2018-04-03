import {ExcelCell} from "./ExcelCell";
import {ExcelColumn} from "./ExcelColumn";

export class ExcelWorksheet {
    private _cells: ExcelCell[][] = [];

    get cells(): ExcelCell[][] {
        return this._cells;
    }

    private _columns: ExcelColumn[] = [];
    freeze: { row: number; col: number | undefined } | undefined;
    merges: { fromRow: number; fromCol: number; toRow: number; toCol: number }[] = [];

    get rowCount(): number {
        return this._cells.length;
    }

    get colCount(): number {
        let max = 0;
        for (const row of this._cells) {
            max = Math.max(max, row.length);
        }
        return max;
    }

    constructor(public name: string) {
    }

    cell(row: number, col: number): ExcelCell {
        while (this._cells.length < row + 1) {
            this._cells.push([]);
        }
        while (this._cells[row].length < col + 1) {
            this._cells[row].push(new ExcelCell());
        }
        while (this._columns.length < col + 1) {
            this._columns.push(new ExcelColumn());
        }
        return this._cells[row][col];
    }

    row(row: number): ExcelCell[] {
        return this._cells[row];
    }

    col(col: number): ExcelColumn {
        while (this._columns.length < col + 1) {
            this._columns.push(new ExcelColumn());
        }
        return this._columns[col];
    }

    get cols(): ExcelColumn[] {
        return this._columns;
    }

    freezePane(row: number, col?: number): void {
        this.freeze = {row, col};
    }

    merge(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
        this.merges.push({fromRow, fromCol, toRow, toCol});
    }
}