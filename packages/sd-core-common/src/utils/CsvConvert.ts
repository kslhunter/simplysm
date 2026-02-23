import { StringUtils } from "./StringUtils";

export class CsvConvert {
  static parse(content: string, columnSplitter: string): (string | undefined)[][] {
    const lines = content.split("\r\n");
    if (lines.length === 0) return [];

    const rows: (string | undefined)[][] = [];

    for (const line of lines) {
      if (StringUtils.isNullOrEmpty(line)) continue;

      const row: (string | undefined)[] = [];
      let currStr = "";
      let isInQuote = false;

      for (let cursor = 0; cursor < line.length; cursor++) {
        // '"' 시작
        if (
          line[cursor] === '"' &&
          !isInQuote &&
          (cursor === 0 || line[cursor - 1] === columnSplitter)
        ) {
          isInQuote = true;
          currStr = "";
        }
        // '"' 종료
        else if (
          line[cursor] === '"' &&
          isInQuote &&
          (cursor === line.length - 1 || line[cursor + 1] === columnSplitter)
        ) {
          isInQuote = false;
        }
        // '"'안의 '""' 인경우 하나만 인식
        else if (line[cursor] === '"' && line[cursor + 1] === '"' && isInQuote) {
        }
        // 입력종료 및 다음 텍스트
        else if (line[cursor] === columnSplitter && !isInQuote) {
          row.push(StringUtils.isNullOrEmpty(currStr) ? undefined : currStr.trim());
          currStr = "";
        } else {
          currStr += line[cursor];
        }
      }

      row.push(StringUtils.isNullOrEmpty(currStr) ? undefined : currStr.trim());
      rows.push(row);
    }

    const columnCountErrRowNums = rows
      .map((row, i) => (rows.length > 0 && rows[0].length !== row.length ? i + 1 : undefined))
      .filterExists();
    if (columnCountErrRowNums.length > 0) {
      throw new Error(
        `CSV 형식 오류: ROW의 컬럼수가 첫 ROW와 다름 (ROW번호: ${columnCountErrRowNums.join(", ")})\n- 컬럼수 혹은 특정 컬럼안의 '"' Pair 문제일 수 있습니다.`,
      );
    }

    return rows;
  }
}
