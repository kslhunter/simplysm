# ExcelXmlSharedStringData

`sharedStrings.xml` 데이터 구조이다. 내부 구현에 사용된다.

```typescript
export interface ExcelXmlSharedStringData {
  sst: {
    $: { xmlns: string };
    si?: ExcelXmlSharedStringDataSi[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sst.$` | `{ xmlns: string }` | 네임스페이스 |
| `sst.si` | `ExcelXmlSharedStringDataSi[] \| undefined` | 공유 문자열 항목 배열 |

## Related Types

### `ExcelXmlSharedStringDataSi`

SharedString 개별 항목이다. discriminated union으로, `t` 키가 있으면 단순 텍스트, `r` 키가 있으면 서식 있는 텍스트(rich text)이다.

```typescript
export type ExcelXmlSharedStringDataSi =
  | { t: ExcelXmlSharedStringDataText }
  | { r: { t: ExcelXmlSharedStringDataText }[] };
```

| Variant | Discriminant | Description |
|---------|-------------|-------------|
| `{ t: ... }` | `t` 키 존재 | 단순 텍스트 |
| `{ r: ... }` | `r` 키 존재 | 서식 있는 텍스트 (run 배열) |

### `ExcelXmlSharedStringDataText`

SharedString 텍스트 데이터이다. 단순 문자열 또는 공백 보존 속성이 있는 객체이다.

```typescript
export type ExcelXmlSharedStringDataText = [string | { $: { space?: "preserve" }; _?: string }];
```
