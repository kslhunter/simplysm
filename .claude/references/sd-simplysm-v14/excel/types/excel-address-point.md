# ExcelAddressPoint

셀 좌표를 나타내는 인터페이스이다. 모든 좌표는 0 기반이다.

```typescript
export interface ExcelAddressPoint {
  r: number;
  c: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |
| `c` | `number` | 열 인덱스 (0 기반) |

## Related Types

### `ExcelAddressRangePoint`

셀 범위 좌표를 나타내는 인터페이스이다.

```typescript
export interface ExcelAddressRangePoint {
  s: ExcelAddressPoint;
  e: ExcelAddressPoint;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `s` | `ExcelAddressPoint` | 시작 좌표 |
| `e` | `ExcelAddressPoint` | 끝 좌표 |
