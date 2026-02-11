# result-parser.ts 2단계 최적화 설계

## 개요

`packages/orm-common/src/utils/result-parser.ts`의 `serializeGroupKey`와 `JSON.stringify` 호출을 최적화하여 대용량 쿼리 결과 처리 속도를 개선한다.

## 배경

### 1단계 완료 사항

- `objClone` 호출 4곳 제거 완료
- 성능 테스트 추가

### 2단계 최적화 대상

| 대상              | 현재 코드                 | 문제점               | 결정      |
| ----------------- | ------------------------- | -------------------- | --------- |
| serializeGroupKey | `Object.entries().sort()` | 매 레코드마다 정렬   | ✅ 최적화 |
| JSON.stringify    | 중복 체크용 해시          | CPU/메모리 비용 높음 | ✅ 최적화 |
| objEqual          | 깊은 비교                 | 호출 빈도 낮음       | ⏭️ 유지   |

---

## 최적화 1: serializeGroupKey 키 순서 캐싱

### 현재 코드 (Line 247-250)

```typescript
function serializeGroupKey(groupKey: Record<string, unknown>): string {
  const entries = Object.entries(groupKey).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}:${v === null ? "null" : String(v)}`).join("|");
}
```

### 문제점

- 매 레코드마다 `Object.entries().sort()` 호출
- 같은 스키마의 레코드는 키 순서가 동일한데 매번 정렬
- 정렬 비용: O(k log k) where k = 키 개수

### 변경 후

```typescript
function serializeGroupKey(groupKey: Record<string, unknown>, cachedKeyOrder?: string[]): string {
  const keys = cachedKeyOrder ?? Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}:${groupKey[k] === null ? "null" : String(groupKey[k])}`).join("|");
}
```

호출부에서 캐싱:

```typescript
// groupRecordsRecursively 내부
let groupKeyOrder: string[] | undefined;

for (const record of records) {
  const groupKey = extractGroupKey(record, childJoinKeys);
  if (groupKeyOrder == null) {
    groupKeyOrder = Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  }
  const keyStr = serializeGroupKey(groupKey, groupKeyOrder);
  // ...
}
```

### 예상 효과

- 첫 호출: O(k log k) 정렬
- 이후 호출: O(k) 순회만
- 대용량 데이터에서 유의미한 개선

---

## 최적화 2: JSON.stringify → serializeGroupKey

### 현재 코드 (Line 422, 426)

```typescript
// Line 422 - 첫 항목 추가 시
existingGroup[hashSetKey] = new Set([JSON.stringify(newJoinData)]);

// Line 426 - 추가 항목 해시 생성
const newHash = JSON.stringify(newJoinData);
```

### 문제점

- `JSON.stringify`는 CPU 비용 높음
- 중첩 객체 직렬화 비용
- 생성된 문자열이 Set에 저장되어 메모리 사용

### 변경 후

```typescript
// Line 422
existingGroup[hashSetKey] = new Set([serializeGroupKey(newJoinData)]);

// Line 426
const newHash = serializeGroupKey(newJoinData);
```

### 안전성 근거

- `newJoinData`는 `flatToNested` 결과
- 중첩 객체 없이 primitive 값만 포함
- `serializeGroupKey`로 충분히 고유한 해시 생성 가능

### 예상 효과

- `JSON.stringify` 대비 가벼운 직렬화
- 키 순서 정렬로 일관된 해시 보장

---

## 검증 계획

1. 기존 테스트 통과 확인: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
2. 성능 테스트 실행: `pnpm vitest packages/orm-common/tests/utils/result-parser-perf.spec.ts --run --project=node`
3. 타입체크/린트 통과

## 제약 사항

- `serializeGroupKey`의 시그니처 변경으로 호출부 수정 필요
- 캐싱 로직 추가로 코드 복잡도 약간 증가
