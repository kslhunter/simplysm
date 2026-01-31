# @simplysm/core-common

심플리즘 프레임워크의 공통 유틸리티 패키지이다.

## 설치

```bash
npm install @simplysm/core-common
# 또는
pnpm add @simplysm/core-common
```

## 초기화

애플리케이션 엔트리 포인트(예: `index.ts`, `main.ts`)에서 패키지를 임포트하세요:

```typescript
import "@simplysm/core-common";
```

이 임포트는 Map, Set 프로토타입 확장을 전역으로 활성화합니다.
확장 메서드(`getOrCreate()`, `toggle()` 등)를 사용하려면 반드시 앱 시작 시 임포트해야 합니다.

## 주요 모듈

### Errors

커스텀 에러 클래스들이다.

| 클래스 | 설명 |
|--------|------|
| `SdError` | 기본 에러 클래스 (cause 체인으로 오류 추적, 중첩된 스택 자동 통합) |
| `ArgumentError` | 인자 검증 에러 (YAML 포맷팅) |
| `NotImplementedError` | 미구현 기능 표시 |
| `TimeoutError` | 타임아웃 에러 |

### Types

불변 커스텀 타입 클래스들이다.

| 클래스 | 설명 |
|--------|------|
| `DateTime` | 날짜+시간 (밀리초 단위) |
| `DateOnly` | 날짜만 (시간 제외) |
| `Time` | 시간만 (날짜 제외) |
| `Uuid` | UUID v4 |
| `LazyGcMap` | 자동 만료 기능이 있는 Map (LRU) |
| `PrimitiveTypeStr` | 원시 타입 문자열 (`"string"`, `"number"` 등) |

### Zip

ZIP 파일 압축/해제 유틸리티이다.

| 클래스 | 설명 |
|--------|------|
| `ZipArchive` | ZIP 파일 읽기/쓰기/압축 해제 (`await using` 지원) |

### Utils

유틸리티 함수들이다.

| 함수/클래스 | 설명 |
|--------|------|
| `objClone`, `objEqual`, `objMerge` | 깊은 복사/비교/병합/3-way 병합 (충돌 감지) |
| `jsonStringify`, `jsonParse` | 커스텀 타입 지원 JSON 직렬화 |
| `xmlParse`, `xmlStringify` | XML 파싱/변환 |
| `transferableEncode`, `transferableDecode` | Worker 데이터 변환 |
| `strJosa`, `strToCamelCase`, `strToKebabCase` 등 | 한글 조사 처리, 케이스 변환 (camelCase, kebab-case 등) |
| `format`, `normalizeMonth` | 날짜/시간 포맷팅 (C#과 동일한 포맷 문자열 지원: yyyy, MM, dd, HH, mm, ss 등) |
| `numParseInt`, `numParseFloat`, `numFormat` | 숫자 파싱/포맷팅 |
| `bytesConcat`, `bytesToHex` | Uint8Array 연결, hex 변환 |
| `waitTime`, `waitUntil` | 비동기 대기 (지정 시간 대기, 조건 충족 대기 + 최대 시도 횟수 제한) |
| `arrSingle`, `arrToMap`, `arrDiffs` 등 | 배열 유틸리티 (Remeda에 없는 기능) |
| `DebounceQueue` | 비동기 디바운스 큐 (마지막 요청만 실행) |
| `SerialQueue` | 비동기 직렬 큐 (순차 실행) |
| `SdEventEmitter` | EventTarget 래퍼 (type-safe 이벤트) |
| `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` | 템플릿 리터럴 태그 (IDE 하이라이팅) |

### Extensions

Array, Map, Set 프로토타입 확장이다.

**Array 확장 메서드**:
- `single()`, `first()`, `last()`: 단일/첫 번째/마지막 요소 조회
- `filterExists()`, `ofType()`: 필터링 (null/undefined 제거, 타입별)
- `mapMany()`, `mapAsync()`, `mapManyAsync()`, `filterAsync()`, `parallelAsync()`: 매핑/비동기 처리
- `groupBy()`, `toMap()`, `toArrayMap()`, `toSetMap()`, `toMapValues()`, `toObject()`: 변환
- `toTree()`: 트리 구조 변환
- `distinct()`, `distinctThis()`: 중복 제거
- `orderBy()`, `orderByDesc()`, `orderByThis()`, `orderByDescThis()`: 정렬
- `diffs()`, `oneWayDiffs()`, `merge()`: 배열 비교/병합
- `sum()`, `min()`, `max()`: 집계
- `shuffle()`: 셔플
- `insert()`, `remove()`, `toggle()`, `clear()`: 변형 (원본 수정)

**Map 확장 메서드**:
- `getOrCreate()`: 키에 해당하는 값이 없으면 새 값 설정 후 반환
- `update()`: 키에 해당하는 값을 함수로 업데이트

**Set 확장 메서드**:
- `adds()`: 여러 값을 한 번에 추가
- `toggle()`: 값 토글 (있으면 제거, 없으면 추가)

## 주의사항

### 프로토타입 확장 충돌

이 패키지는 Map, Set 프로토타입을 확장한다.
동일한 메서드명을 확장하는 다른 라이브러리와 함께 사용 시 충돌이 발생할 수 있다.
충돌 시 로드 순서에 따라 마지막에 정의된 구현이 적용된다.

### 타임존 처리

`DateOnly.parse()`, `DateTime.parse()` 사용 시:
- `yyyy-MM-dd`, `yyyyMMdd` 형식: 문자열에서 직접 파싱 (타임존 영향 없음)
- ISO 8601 형식 (`2024-01-15T00:00:00Z`): UTC로 해석 후 로컬 변환

서버와 클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식을 적극 활용한다.

### 메모리 관리 (LazyGcMap)

`LazyGcMap`은 내부 GC 타이머가 있으므로 반드시 정리해야 한다.

```typescript
// using 문 사용 (권장)
// gcInterval: GC 실행 간격 (ms), expireTime: 항목 만료 시간 (ms)
using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // 10초 간격 GC, 60초 후 만료

// 또는 명시적 dispose() 호출
const map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // 10초 간격 GC, 60초 후 만료
try {
  // ... 사용
} finally {
  map.dispose();
}
```

### 멀티스레드 환경 (JsonConvert)

`JsonConvert.stringify()`는 내부적으로 `Date.prototype.toJSON`을 임시 수정한다.
Worker 환경에서 동시 호출 시 경쟁 조건이 발생할 수 있으므로 단일 스레드에서만 사용한다.

## 라이선스

Apache-2.0
