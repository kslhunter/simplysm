import {Exception} from "@simplism/sd-core";

export class ExcelAddress {
  public static parse(str: string): number[] {
    if (str.indexOf(":") > 0) {
      const matches = str.match(/([A-Z]*)([0-9]*):([A-Z]*)([0-9]*)/);
      if (!matches) {
        throw new Exception("파싱 오류");
      }

      const fromCol = this._parseColAddress(matches[1]);
      const fromRow = Number.parseInt(matches[2]) - 1;
      const toCol = this._parseColAddress(matches[3]);
      const toRow = Number.parseInt(matches[4]) - 1;
      return [fromRow, fromCol, toRow, toCol];
    }
    else {
      const matches = str.match(/([A-Z]*)([0-9]*)/);
      if (!matches) {
        throw new Exception("파싱 오류");
      }

      const col = this._parseColAddress(matches[1]);
      const row = Number.parseInt(matches[2]) - 1;
      return [row, col];
    }
  }

  public static get(arr: number[]): string {
    if (arr.length === 4) {
      const fromRow = (arr[0] + 1).toString();
      const fromCol = this._getColAddress(arr[1]);
      const toRow = (arr[2] + 1).toString();
      const toCol = this._getColAddress(arr[3]);
      return `${fromCol + fromRow}:${toCol}${toRow}`;
    }
    else {
      const col = this._getColAddress(arr[1]);
      const row = (arr[0] + 1).toString();
      return col + row;
    }
  }

  private static _parseColAddress(str: string): number {
    let result = str.charCodeAt(str.length - 1) - 65;
    for (let i = 0; i < str.length - 1; i++) {
      result += (str.charCodeAt(i) - 64) * (Math.pow(26, str.length - 1 - i));
    }
    return result;
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
