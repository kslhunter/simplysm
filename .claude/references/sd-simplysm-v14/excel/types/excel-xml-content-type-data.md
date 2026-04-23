# ExcelXmlContentTypeData

`[Content_Types].xml` 데이터 구조이다. 내부 구현에 사용된다.

```typescript
export interface ExcelXmlContentTypeData {
  Types: {
    $: { xmlns: string };
    Default: { $: { Extension: string; ContentType: string } }[];
    Override: { $: { PartName: string; ContentType: string } }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Types.$` | `{ xmlns: string }` | 네임스페이스 |
| `Types.Default` | `Array` | 확장자별 기본 콘텐트 타입 |
| `Types.Default[].$.Extension` | `string` | 파일 확장자 |
| `Types.Default[].$.ContentType` | `string` | MIME 타입 |
| `Types.Override` | `Array` | 파일별 오버라이드 콘텐트 타입 |
| `Types.Override[].$.PartName` | `string` | 파일 경로 |
| `Types.Override[].$.ContentType` | `string` | MIME 타입 |
