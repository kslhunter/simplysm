# `ExcelCol`

> **읽어야 하는 상황**: 특정 열의 셀들을 일괄 접근하거나 열 너비를 설정할 때. 행 단위 접근은 [`ExcelRow`](./excel-row.md) 참조.

Excel 워크시트의 열을 나타내는 클래스. 셀 접근 및 열 너비 설정 기능을 제공한다.

```typescript
export class ExcelCol {
  constructor(zipCache: ZipCache, targetFileName: string, c: number, cellFactory: (r: number) => ExcelCell);

  cell(r: number): ExcelCell;
  async getCells(): Promise<ExcelCell[]>;
  async setWidth(size: number): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `cell` | method | `(r: number) => ExcelCell` | 지정된 행 인덱스의 셀 반환 (0 기반) |
| `getCells` | method | `() => Promise<ExcelCell[]>` | 열의 모든 셀 반환. 데이터 범위 내의 모든 행에 대한 셀이 포함된다 |
| `setWidth` | method | `(size: number) => Promise<void>` | 열 너비 설정 |

## Usage

```typescript
const col = ws.col(1); // B열

// 특정 셀 접근
const cell = col.cell(0); // B1 셀

// 열의 모든 셀
const cells = await col.getCells();

// 열 너비 설정
await ws.col(0).setWidth(20);
```
