# result-parser.ts 메모리/속도 최적화 설계

## 개요

`packages/orm-common/src/utils/result-parser.ts`의 `objClone` 호출을 제거하여 대용량 쿼리 결과 처리 속도를 개선한다.

## 배경

### 현재 문제

- 100MB 이상 데이터 처리 시 속도 저하 체감
- `objClone`이 4곳에서 호출되어 불필요한 깊은 복사 발생
- JOIN 구조: 단순/중첩/복합 혼합

### 분석 결과

`flatToNested` 함수가 이미 완전히 새로운 객체를 생성함:

```typescript
// Line 75: 새 객체 생성
const result: Record<string, unknown> = {};

// Line 90: 중첩 객체도 새로 생성
current[part] = {};

// parseValue: primitive 또는 새 인스턴스(DateTime 등) 반환
```

따라서 `objClone` 호출은 **이중 복사**로, 불필요함.

## 1단계: objClone 제거

### 변경 사항

| 위치     | 현재 코드                 | 변경 코드       | 이유                                                |
| -------- | ------------------------- | --------------- | --------------------------------------------------- |
| Line 304 | `objClone(record)`        | `{ ...record }` | 이후 `delete` 연산으로 키 삭제 있음, 얕은 복사 필요 |
| Line 414 | `objClone(newJoinData)`   | `newJoinData`   | 이미 새 객체, 복사 불필요                           |
| Line 420 | `[objClone(newJoinData)]` | `[newJoinData]` | 이미 새 객체, 복사 불필요                           |
| Line 430 | `objClone(newJoinData)`   | `newJoinData`   | 이미 새 객체, 복사 불필요                           |

### 안전성 근거

1. **결과는 읽기 전용** - 수정되지 않고 바로 JSON 직렬화하여 네트워크 전송
2. **원본 `rawResults` 이후 미사용** - 파싱 후 버려짐
3. **`flatToNested`가 새 객체 생성** - 원본과 참조 공유 없음

### 예상 효과

| 항목            | 현재                     | 변경 후      |
| --------------- | ------------------------ | ------------ |
| `objClone` 호출 | 레코드당 최대 4회        | 0회          |
| 깊은 복사 비용  | O(객체 크기 × 중첩 깊이) | 제거         |
| 얕은 복사       | 없음                     | 레코드당 1회 |

## 2단계 후보 (효과 측정 후 검토)

1단계 적용 후 성능 측정 결과에 따라 추가 최적화 검토:

### 2-1. JSON.stringify 최적화

현재 중복 체크용 해시 생성에 `JSON.stringify` 사용:

```typescript
// Line 422, 426
const newHash = JSON.stringify(newJoinData);
```

대안:

- 커스텀 해시 함수 (특정 필드만 사용)
- 객체 참조 기반 비교 (WeakMap)

### 2-2. serializeGroupKey 최적화

매 레코드마다 `Object.entries().sort()` 호출:

```typescript
// Line 248
const entries = Object.entries(groupKey).sort(([a], [b]) => a.localeCompare(b));
```

대안:

- 키 순서가 일정하면 정렬 생략
- 키 목록 캐싱

### 2-3. objEqual 최적화

Line 410, 435에서 깊은 비교:

```typescript
if (!objEqual(existingJoinData, newJoinData)) { ... }
```

대안:

- 얕은 비교로 충분한 경우 대체
- 해시 기반 비교

## 검증 계획

1. 기존 테스트 통과 확인: `pnpm vitest packages/orm-common`
2. 대용량 데이터 벤치마크 (선택)

## 제약 사항

- 결과 객체 수정 시 동작 보장 안함 (기존에도 권장하지 않음)
- API 문서에 "결과는 읽기 전용" 명시 권장
