# ExcelXmlRelationshipData

`*.rels` 파일 데이터 구조이다. 내부 구현에 사용된다.

```typescript
export interface ExcelXmlRelationshipData {
  Relationships: {
    $: { xmlns: string };
    Relationship?: ExcelRelationshipData[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Relationships.$` | `{ xmlns: string }` | 네임스페이스 |
| `Relationships.Relationship` | `ExcelRelationshipData[] \| undefined` | 관계 항목 배열 |

## Related Types

### `ExcelRelationshipData`

개별 Relationship 엔트리 데이터이다.

```typescript
export interface ExcelRelationshipData {
  $: {
    Id: string;
    Target: string;
    Type: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.Id` | `string` | 관계 ID (예: `"rId1"`) |
| `$.Target` | `string` | 대상 파일 경로 |
| `$.Type` | `string` | 관계 타입 URI |
