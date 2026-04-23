# ExcelRow

Excel 워크시트의 행을 나타내는 클래스. 셀 접근 기능을 제공한다.

```typescript
export class ExcelRow {
  constructor(zipCache: ZipCache, targetFileName: string, r: number, cellFactory: (c: number) => ExcelCell);

  cell(c: number): ExcelCell;
  async getCells(): Promise<ExcelCell[]>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `cell` | method | `(c: number) => ExcelCell` | 지정된 열 인덱스의 셀 반환 (0 기반) |
| `getCells` | method | `() => Promise<ExcelCell[]>` | 행의 모든 셀 반환. 데이터 범위 내의 모든 열에 대한 셀이 포함된다 |

## Usage

```typescript
const row = ws.row(0);

// 특정 셀 접근
const cell = row.cell(2); // C열 셀

// 행의 모든 셀
const cells = await row.getCells();
for (const cell of cells) {
  const val = await cell.getValue();
}
```
