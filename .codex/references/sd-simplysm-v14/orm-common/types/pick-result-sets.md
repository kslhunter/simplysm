# `pickResultSets`

> **읽어야 하는 상황**: 커스텀 executor나 query builder 연동 코드에서 여러 result set 중 현재 `QueryBuildResult`가 가리키는 결과만 꺼내야 할 때. DB 원시 row를 TypeScript 객체로 변환해야 하면 [`parseQueryResult`](./parse-query-result.md)를 함께 확인.

## When to use

- ✅ 이런 상황에 사용: SQL 한 번의 실행 결과가 `T[][]` 형태로 여러 result set을 반환하고, `resultSetIndex` 또는 `resultSetStride` 기준으로 소비할 row 배열을 선택해야 할 때.
- ❌ 이런 상황엔 대신 [`parseQueryResult`](./parse-query-result.md) — 단일 result set의 column 타입 변환과 JOIN 중첩 객체 구성이 목적일 때.

## Signature

```typescript
export function pickResultSets<T>(
  rawResults: T[][],
  buildResult: Pick<QueryBuildResult, "resultSetIndex" | "resultSetStride">,
): T[];
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `rawResults` | `T[][]` | DB 실행 결과로 받은 result set 배열 |
| `buildResult` | `Pick<QueryBuildResult, "resultSetIndex" \| "resultSetStride">` | query builder가 계산한 result set 위치 메타데이터 |

## Returns

`T[]` — 선택된 result set의 row 배열. 매칭되는 result set이 없으면 빈 배열을 반환한다.

## Usage

```typescript
const rows = pickResultSets(
  [
    [{ affectedRows: 1 }],
    [{ id: 1, name: "Alice" }],
  ],
  { resultSetIndex: 1 },
);
// [{ id: 1, name: "Alice" }]
```

## 동작

- `resultSetIndex`가 없으면 `rawResults[0] ?? []`를 반환한다.
- `resultSetStride`가 없으면 `rawResults[resultSetIndex] ?? []`를 반환한다.
- `resultSetStride`가 있으면 `resultSetIndex`부터 stride 간격의 모든 result set을 concat한다. MySQL 배치 INSERT처럼 `INSERT;SELECT;INSERT;SELECT;...` 형태에서 SELECT 결과만 모을 때 사용한다.
