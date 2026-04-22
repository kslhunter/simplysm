# ExcelXmlWorksheetData

`worksheet*.xml` 데이터 구조이다. 내부 구현에 사용된다.

```typescript
export interface ExcelXmlWorksheetData {
  worksheet: {
    $: { "xmlns": string; "xmlns:r"?: string };
    dimension?: [{ $: { ref: string } }];
    sheetViews?: [{ sheetView: { $: { workbookViewId: string; zoomScale?: string }; pane?: [{ $: { xSplit?: string; ySplit?: string; topLeftCell?: string; activePane?: string; state?: string } }] }[] }];
    sheetFormatPr?: [{ $: { defaultRowHeight: string } }];
    cols?: [{ col: { $: { min: string; max: string; width?: string; bestFit?: string; customWidth?: string } }[] }];
    sheetData: [{ row?: ExcelRowData[] }];
    mergeCells?: [{ $: { count: string }; mergeCell: { $: { ref: string } }[] }];
    drawing?: { $: { "r:id": string } }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `worksheet.dimension` | `Array \| undefined` | 데이터 범위 (예: `"A1:C10"`) |
| `worksheet.sheetViews` | `Array \| undefined` | 시트 뷰 설정 (줌, 틀 고정) |
| `worksheet.sheetFormatPr` | `Array \| undefined` | 기본 행 높이 |
| `worksheet.cols` | `Array \| undefined` | 열 설정 (너비 등) |
| `worksheet.sheetData` | `Array` | 행 데이터 |
| `worksheet.mergeCells` | `Array \| undefined` | 병합 셀 정보 |
| `worksheet.drawing` | `Array \| undefined` | 드로잉 관계 참조 |

## Related Types

### `ExcelRowData`

행 XML 데이터이다.

```typescript
export interface ExcelRowData {
  $: { r: string };
  c?: ExcelCellData[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | 행 주소 (1 기반, 예: `"1"`, `"10"`) |
| `c` | `ExcelCellData[] \| undefined` | 셀 데이터 배열 |

### `ExcelCellData`

셀 XML 데이터이다.

```typescript
export interface ExcelCellData {
  $: { r: string; s?: string; t?: ExcelCellType };
  v?: [string];
  f?: [string];
  is?: { t?: (string | { _?: string })[] }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | 셀 주소 (예: `"A1"`, `"B3"`) |
| `$.s` | `string \| undefined` | 스타일 ID |
| `$.t` | `ExcelCellType \| undefined` | 셀 타입 |
| `v` | `[string] \| undefined` | 셀 값 |
| `f` | `[string] \| undefined` | 수식 |
| `is` | `Array \| undefined` | 인라인 문자열 데이터 |
