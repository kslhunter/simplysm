# `parseQueryResult`

> **읽어야 하는 상황**: 커스텀 `DbContextExecutor`를 구현하여 DB 원시 결과를 중첩 TypeScript 객체로 변환할 때. `Queryable.execute()` 내부에서 자동 호출되므로 일반 사용에서는 직접 호출 불필요.

DB 쿼리 원시 결과(`Record<string, unknown>[]`)를 `ResultMeta`를 이용해 타입 변환하고, JOIN 결과를 중첩 TypeScript 객체로 재구성한다. `Queryable.execute()` 내부에서 자동 호출되며, 직접 호출은 커스텀 executor 구현 시에만 필요하다.

```typescript
export async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `rawResults` | `Record<string, unknown>[]` | DB에서 반환된 플랫 원시 결과 배열 |
| `meta` | `ResultMeta` | 컬럼 타입 정보 및 JOIN 구조 정보 |

## Returns

`Promise<TRecord[] | undefined>` — 타입 변환 및 중첩 구조로 재구성된 결과 배열. 입력이 비어 있거나 파싱 후 모든 레코드가 빈 객체이면 `undefined` 반환.

## 동작

1. **단순 타입 파싱** (JOIN 없는 경우): `meta.columns`에 따라 각 컬럼 값을 TypeScript 타입으로 변환한다. 예를 들어 `"1"` → `1`, `"2026-01-07T10:00:00.000Z"` → `DateTime`.
2. **JOIN 결과 중첩** (JOIN 있는 경우): `meta.joins`에 따라 `"posts.id"` 등 점 구분 플랫 키를 중첩 객체/배열로 그룹핑한다. `isSingle: false`이면 배열, `isSingle: true`이면 단일 객체로 조합한다.
3. **비동기 양보**: 100개 레코드마다 이벤트 루프에 양보하여 대규모 결과 처리 시 UI/다른 작업을 차단하지 않는다.

## 주의사항

- `meta` 없이는 이 함수를 호출할 필요가 없다 (입력 = 출력).
- 브라우저/Node.js 양쪽에서 동작한다 (`setImmediate` 또는 `setTimeout` 폴백).
- 타입 파싱 실패(숫자 변환 실패 등) 시 에러를 던진다.

## Usage

```typescript
// 단순 타입 파싱
const raw = [{ id: "1", createdAt: "2026-01-07T10:00:00.000Z" }];
const meta: ResultMeta = {
  columns: { id: "number", createdAt: "DateTime" },
  joins: {},
};
const result = await parseQueryResult(raw, meta);
// [{ id: 1, createdAt: DateTime(...) }]

// JOIN 결과 중첩
const raw = [
  { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
  { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
];
const meta: ResultMeta = {
  columns: { id: "number", name: "string", "posts.id": "number", "posts.title": "string" },
  joins: { posts: { isSingle: false } },
};
const result = await parseQueryResult(raw, meta);
// [{ id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] }]
```
