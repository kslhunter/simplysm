# _Migration

시스템 마이그레이션 테이블 정의. `DbContext`가 내부적으로 사용하며, `initialize()`가 실행된 마이그레이션 이름을 이 테이블에 기록한다.

```typescript
export const _Migration: TableBuilder<
  { code: ColumnBuilder<string, { type: "string"; dataType: { type: "varchar"; length: 255 } }> },
  never
>;
```

내부 정의:
```typescript
export const _Migration = Table("_migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("시스템 마이그레이션 테이블")
  .primaryKey("code");
```

## 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `code` | `varchar(255)` (PK) | 실행된 마이그레이션 이름 |

## Usage

`DbContext`에서 `this._migration`으로 접근 가능하나, 일반적으로 직접 조작하지 않고 `initialize()`를 통해 자동 관리한다.

```typescript
// initialize()가 내부적으로 사용
await db.connectWithoutTransaction(async () => {
  await db.initialize(); // _migration 테이블 생성 + 미실행 마이그레이션 순차 실행
});
```
