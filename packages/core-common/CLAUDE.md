# core-common 개발 가이드

> SIMPLYSM 프레임워크의 공통 유틸리티 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-core-common`(구버전)은 참고 금지.

**이 문서는 Claude Code가 core-common 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md) 함께 확인하세요.**
**사용자 문서는 [README.md](README.md)를 참고하세요.**

## 아키텍처

```
Application
    ↓
angular, cli, etc.        (마이그레이션 예정)
    ↓
core-browser / core-node  (core-browser 완료, core-node 예정)
    ↓
orm-common                (완료)
    ↓
core-common               ← 최하위 레이어 (의존성 없음)
```

**핵심**: 모든 SIMPLYSM 패키지의 공통 기반. 브라우저/Node 양쪽에서 사용 가능.

## 브라우저 호환성 제약 (Chrome 79+)

프로젝트 타겟이 Chrome 79+이므로 다음 API들은 **사용 불가**:

| API | 최소 버전 | 대체 구현 |
|-----|----------|----------|
| `crypto.randomUUID()` | Chrome 92 | `Uuid` 클래스 (getRandomValues 기반) |
| `structuredClone()` | Chrome 98 | `ObjectUtils.clone()` |
| Temporal API | 미정 (Stage 3) | `DateTime`, `DateOnly`, `Time` 클래스 |

**참고**: 향후 타겟 버전 상향 시 표준 API 전환 검토

## 모듈 구조

```
src/
├── errors/          # 커스텀 에러 클래스
├── types/           # 커스텀 타입 클래스 (Uuid, DateTime, DateOnly, Time, LazyGcMap)
├── extensions/      # Array, Map, Set 프로토타입 확장
├── utils/           # 유틸리티 함수들
│   ├── template-strings.ts  # 태그 템플릿 유틸리티 (dedent, stripIndent)
│   └── ...
├── zip/             # ZIP 파일 처리
├── types.ts         # 타입 유틸리티 (PrimitiveType 등)
└── index.ts         # 진입점
```

## 주요 컴포넌트

### 에러 클래스 (errors/)

| 클래스 | 용도 |
|--------|------|
| `SdError` | 기본 에러, cause 체이닝 지원 |
| `ArgumentError` | 잘못된 인수, YAML로 argObj 표시 |
| `NotImplementError` | 미구현 기능 표시 |
| `TimeoutError` | 타임아웃, millisecond 표시 |

**상속 구조**: `Error` → `SdError` → `ArgumentError`, `NotImplementError`, `TimeoutError`

### 타입 클래스 (types/)

| 클래스 | 용도 |
|--------|------|
| `Uuid` | UUID v4, bytes 변환 지원 |
| `DateTime` | 날짜+시간, 불변성 (setX → 새 인스턴스) |
| `DateOnly` | 날짜만, 불변성 |
| `Time` | 시간만, 불변성 |
| `LazyGcMap` | GC 친화적 Map, 지연 정리 |

**DateTime/DateOnly/Time 불변성**:
```typescript
// ✅ 새 인스턴스 반환
const dt2 = dt.setYear(2025);

// ❌ setter 없음
dt.year = 2025;  // 불가
```

### 확장 메서드 (extensions/)

#### Array.ext.ts (주요 메서드)

| 메서드 | 설명 | 원본 변경 |
|--------|------|----------|
| `orderBy(fn)` | 오름차순 정렬 | ❌ |
| `orderByDesc(fn)` | 내림차순 정렬 | ❌ |
| `distinct(matchAddress?)` | 중복 제거 | ❌ |
| `single(fn)` | 단일 요소 (없으면 undefined, 여러 개면 에러) | ❌ |
| `last(fn?)` | 마지막 요소 | ❌ |
| `sum(fn?)` | 합계 | - |
| `min(fn?)` / `max(fn?)` | 최소/최대 | - |
| `groupBy(fn)` | 그룹화 | ❌ |
| `toMap(keyFn, valueFn?)` | Map 변환 | ❌ |
| `toArrayMap(keyFn)` | 배열 값 Map | ❌ |
| `mapMany(fn)` | flatMap | ❌ |
| `insert(index, item)` | 삽입 | ❌ |
| `remove(item\|fn)` | 제거 | ✅ |

**주의**: `remove()`만 원본을 변경합니다.

#### Map.ext.ts

| 메서드 | 설명 |
|--------|------|
| `getOrCreate(key, valueOrFactory)` | 없으면 생성 후 반환 |
| `update(key, updater)` | 값 업데이트 |

**주의**: `getOrCreate`에서 V 타입이 함수인 경우, 함수를 직접 전달하면 팩토리로 호출됨. 함수 값 저장 시 팩토리로 감싸기: `map.getOrCreate("key", () => myFn)`

#### Set.ext.ts

| 메서드 | 설명 |
|--------|------|
| `adds(...items)` | 여러 항목 추가 |
| `toggle(item)` | 있으면 제거, 없으면 추가 |

### 유틸리티 (utils/)

| 파일 | 주요 함수 |
|------|----------|
| `object.ts` | `ObjectUtils.clone`, `equal`, `merge`, `omit`, `pick`, `getChainValue` 등 |
| `string.ts` | `StringUtils.getSuffix`, `toPascalCase` 등 |
| `number.ts` | `NumberUtils.parseInt`, `parseFloat`, `format` |
| `json.ts` | `JsonConvert.stringify/parse` (커스텀 타입 지원) |
| `xml.ts` | `XmlConvert.stringify/parse` |
| `wait.ts` | `wait(ms)`, `waitUntil(fn)` |
| `debounce-queue.ts` | `SdAsyncFnDebounceQueue` |
| `serial-queue.ts` | `SdAsyncFnSerialQueue` |
| `transferable.ts` | `TransferableConvert` (Worker 통신용) |

### JsonConvert 커스텀 타입

`JsonConvert.stringify/parse`가 자동 처리하는 타입:

- `Date` → `{ __type__: "Date", data: "ISO string" }`
- `DateTime` → `{ __type__: "DateTime", data: "tick" }`
- `DateOnly` → `{ __type__: "DateOnly", data: "tick" }`
- `Time` → `{ __type__: "Time", data: "tick" }`
- `Uuid` → `{ __type__: "Uuid", data: "uuid string" }`
- `Set` → `{ __type__: "Set", data: [...] }`
- `Map` → `{ __type__: "Map", data: [[k,v], ...] }`
- `Buffer` → `{ type: "Buffer", data: [...] }`
- `Error` → `{ __type__: "Error", data: { name, message, stack } }`

### PrimitiveType 정의 (types.ts)

```typescript
type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Buffer: Buffer;
};

type PrimitiveTypeStr = keyof PrimitiveTypeMap;
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;
```

**getPrimitiveTypeStr(value)**: 값에서 타입 문자열 추론

## sd-core-common과의 차이

### 제거됨

| 항목 | 이유 |
|------|------|
| `decorators/` 전체 | Zod + Signal로 대체 |
| `FnUtils` | minification 취약 |
| `ObjectUtils.validate*` | Zod로 대체 |
| `reflect-metadata` | 데코레이터 제거로 불필요 |
| `NeverEntryError` | 그냥 Error로 대체 |
| `TreeMap` | 사용처 없음 |
| `WrappedType/UnwrappedType/TFlatType` | PrimitiveType으로 대체 |
| `ObjectUtils.clone` 옵션들 | 사용처 없음 |
| `ObjectUtils.pickByType` | 버그 + 사용처 없음 |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| `DateTime/DateOnly/Time` | 불변성 강화 (setter 제거) |
| `Array.distinct` | K가 FlatType일 때 Set 최적화 |
| `SdError` | cause 속성 활용 (ES2022) |
| `ObjectUtils.clone` | 옵션 제거로 단순화 |

## 테스트

### 테스트 구조

```
tests/
├── types/
│   ├── uuid.spec.ts
│   └── date-time.spec.ts
├── utils/
│   ├── object.spec.ts
│   └── json.spec.ts
├── extensions/
│   └── array.spec.ts
└── errors/
    └── errors.spec.ts
```

### 테스트 실행

```bash
# 전체 테스트
npx vitest run packages/core-common

# 특정 파일
npx vitest run packages/core-common/tests/utils/object.spec.ts

# 특정 테스트
npx vitest run packages/core-common -t "clone"
```

### 테스트 현황 (2026-01-06 기준)

**커버리지**: 86%+ (Lines)
**테스트**: 475개, 통과율 100%

<details>
<summary>주요 테스트 파일</summary>

| 카테고리 | 파일 | 테스트 수 |
|---------|------|----------|
| **Types** | uuid.spec.ts | 7 |
| | date-time.spec.ts | 21 |
| | date-only.spec.ts | 32 |
| | time.spec.ts | 39 |
| | types.spec.ts | 10 |
| | lazy-gc-map.spec.ts | 21 |
| **Utils** | object.spec.ts | 43 |
| | json.spec.ts | 23 |
| | string.spec.ts | 43 |
| | number.spec.ts | 35 |
| | xml.spec.ts | 14 |
| | wait.spec.ts | 8 |
| | debounce-queue.spec.ts | 9 |
| | serial-queue.spec.ts | 12 |
| | transferable.spec.ts | 23 |
| **Extensions** | array.spec.ts | 49 |
| | set.spec.ts | 7 |
| **Errors** | errors.spec.ts | 16 |
| **ZIP** | sd-zip.spec.ts | 15 |

</details>

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/core-common/tsconfig.json 2>&1 | grep "^packages/core-common/"

# ESLint
yarn run _sd-cli_ lint "packages/core-common/**/*.ts"

# 테스트
npx vitest run packages/core-common
```
