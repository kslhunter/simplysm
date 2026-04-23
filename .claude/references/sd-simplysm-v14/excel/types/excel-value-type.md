# ExcelValueType

셀에 저장할 수 있는 값의 타입이다.

```typescript
export type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

`DateOnly`, `DateTime`, `Time`은 `@simplysm/core-common` 패키지에서 가져온다.

## Related Types

### `ExcelCellType`

Excel 셀 타입이다. XML의 `t` 속성에 대응한다.

```typescript
export type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

| Value | Description |
|-------|-------------|
| `"s"` | 공유 문자열 (SharedString) |
| `"b"` | boolean |
| `"str"` | 수식 결과 문자열 |
| `"n"` | 숫자 |
| `"inlineStr"` | 인라인 문자열 (서식 있는 텍스트) |
| `"e"` | 에러 |
