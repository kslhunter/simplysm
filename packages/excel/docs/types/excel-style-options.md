# ExcelStyleOptions

셀 스타일 옵션 인터페이스이다. [`ExcelCell.setStyle()`](../core-classes/excel-cell.md)에서 사용한다.

```typescript
export interface ExcelStyleOptions {
  background?: string;
  border?: ExcelBorderPosition[];
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
  numberFormatCode?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `background` | `string \| undefined` | 배경색 (ARGB 형식, 8자리 16진수. 예: `"00FF0000"` = 빨강. alpha는 반전 값) |
| `border` | `ExcelBorderPosition[] \| undefined` | 테두리 위치 배열 |
| `horizontalAlign` | `ExcelHorizontalAlign \| undefined` | 가로 정렬 |
| `verticalAlign` | `ExcelVerticalAlign \| undefined` | 세로 정렬 |
| `numberFormat` | `ExcelNumberFormat \| undefined` | 숫자 형식 프리셋 |
| `numberFormatCode` | `string \| undefined` | 커스텀 Excel formatCode 문자열 (예: `"0.000000"`, `"#,##0.00"`, `"0.00%"`). `numberFormat`과 동시 지정 시 이 필드가 우선 적용된다 |

## Related Types

### `ExcelNumberFormat`

숫자 형식 이름이다. `ExcelStyleOptions.numberFormat`과 [`ExcelUtils`](../utilities/excel-utils.md)의 변환 메서드에서 사용한다.

```typescript
export type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

### `ExcelBorderPosition`

테두리 위치를 나타내는 타입이다.

```typescript
export type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
```

### `ExcelHorizontalAlign`

가로 정렬을 나타내는 타입이다.

```typescript
export type ExcelHorizontalAlign = "center" | "left" | "right";
```

### `ExcelVerticalAlign`

세로 정렬을 나타내는 타입이다.

```typescript
export type ExcelVerticalAlign = "center" | "top" | "bottom";
```
