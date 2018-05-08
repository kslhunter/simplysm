import {ExcelCell} from "./ExcelCell";
import {ExcelColumn} from "./ExcelColumn";

export class ExcelWorksheet {
  public freeze: { row: number; col: number | undefined } | undefined;
  public merges: { fromRow: number; fromCol: number; toRow: number; toCol: number }[] = [];
  private readonly _columns: ExcelColumn[] = [];
  private readonly _cells: ExcelCell[][] = [];

  public constructor(public name: string) {
  }

  public get cells(): ExcelCell[][] {
    return this._cells;
  }

  public get rowCount(): number {
    return this._cells.length;
  }

  public get colCount(): number {
    let max = 0;
    for (const row of this._cells) {
      max = Math.max(max, row.length);
    }

    return max;
  }

  public get cols(): ExcelColumn[] {
    return this._columns;
  }

  public cell(row: number, col: number): ExcelCell {
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

  public row(row: number): ExcelCell[] {
    return this._cells[row];
  }

  public col(col: number): ExcelColumn {
    while (this._columns.length < col + 1) {
      this._columns.push(new ExcelColumn());
    }

    return this._columns[col];
  }

  public freezePane(row: number, col?: number): void {
    this.freeze = {row, col};
  }

  public merge(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    this.merges.push({fromRow, fromCol, toRow, toCol});
  }
}
