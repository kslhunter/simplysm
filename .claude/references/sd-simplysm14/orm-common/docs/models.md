# Models

## `_Migration`

시스템 마이그레이션 테이블 정의. DbContext에서 `initialize()` 호출 시 자동으로 사용되는 내부 테이블이다.

```typescript
export const _Migration: TableBuilder<{ code: ColumnBuilder<string, { type: "string"; dataType: { type: "varchar"; length: 255 } }> }, never>;
```

테이블 구조:

| Column | Type | Description |
|--------|------|-------------|
| `code` | `varchar(255)` | 마이그레이션 코드 (PK) |

`_migration` 테이블은 적용된 마이그레이션 코드를 저장하여 중복 실행을 방지한다. `DbContext.initialize()` 호출 시 이 테이블을 조회하여 미적용 마이그레이션만 실행한다.
