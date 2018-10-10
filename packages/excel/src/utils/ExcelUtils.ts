export class ExcelUtils {
  public static getRangeAddress(fromRow: number, fromCol: number, toRow: number, toCol: number): string {
    return `${this.getAddress(fromRow, fromCol)}:${this.getAddress(toRow, toCol)}`;
  }

  public static getAddress(row: number, col: number): string {
    const rowStr = (row + 1).toString();
    const colStr = this._getColAddress(col);
    return `${colStr}${rowStr}`;
  }

  private static _getColAddress(index: number): string {
    let remained = index;
    let result = String.fromCharCode(remained % 26 + 65);
    remained = Math.floor(remained / 26);
    while (remained !== 0) {
      result = String.fromCharCode(remained % 26 + 64) + result;
      remained = Math.floor(remained / 26);
    }
    return result;
  }
}