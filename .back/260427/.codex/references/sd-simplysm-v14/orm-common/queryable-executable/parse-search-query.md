# `parseSearchQuery`

> **읽어야 하는 상황**: 사용자 검색 텍스트를 SQL LIKE 패턴으로 변환할 때. `Queryable.search()`가 내부적으로 사용하므로, 단순 검색은 [`Queryable`](./queryable.md)의 `search()` 메서드를 직접 사용하는 것이 간편하다.

사용자 입력 검색 텍스트를 파싱하여 SQL LIKE 패턴으로 변환한다. `Queryable.search()`가 내부적으로 사용한다.

```typescript
export function parseSearchQuery(searchText: string): ParsedSearchQuery;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `searchText` | `string` | 검색 쿼리 문자열 |

## Returns

`ParsedSearchQuery` — 파싱된 검색 쿼리 객체

## Related Types

### `ParsedSearchQuery`

```typescript
export interface ParsedSearchQuery {
  /** 일반 검색어 (OR 조건) - LIKE 패턴 */
  or: string[];
  /** 필수 검색어 (AND 조건, + 접두사 또는 따옴표) - LIKE 패턴 */
  must: string[];
  /** 제외 검색어 (NOT 조건, - 접두사) - LIKE 패턴 */
  not: string[];
}
```

## 검색 구문

| 구문 | 의미 | 예시 |
|------|------|------|
| `term1 term2` | OR (하나 이상 일치) | `apple banana` |
| `+term` | 필수 포함 (AND) | `+apple +banana` |
| `-term` | 제외 (NOT) | `apple -banana` |
| `"exact phrase"` | 정확한 구문 일치 (필수) | `"맛있는 과일"` |
| `*` | 와일드카드 | `app*` → `app%` |

## 이스케이프 시퀀스

| 입력 | 의미 |
|------|------|
| `\\` | 리터럴 `\` |
| `\*` | 리터럴 `*` |
| `\%` | 리터럴 `%` |
| `\"` | 리터럴 `"` |
| `\+` | 리터럴 `+` |
| `\-` | 리터럴 `-` |

## Usage

```typescript
parseSearchQuery('apple "delicious fruit" -banana +strawberry')
// {
//   or: ["%apple%"],
//   must: ["%delicious fruit%", "%strawberry%"],
//   not: ["%banana%"]
// }

parseSearchQuery('app* test')
// {
//   or: ["app%", "%test%"],
//   must: [],
//   not: []
// }

// Queryable.search()와 함께 사용
db.user()
  .search((u) => [u.name, u.email], "John +admin -deleted")
```
