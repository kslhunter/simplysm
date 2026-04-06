# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/core-common` — 브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다. 35개의 TypeScript 소스 파일로 구성된다.

외부 의존성: `@zip.js/zip.js`, `consola`, `fast-xml-parser`, `yaml`

tsconfig: `lib: ["ESNext", "WebWorker"]` — DOM 타입 없이 WebWorker 전역(EventTarget, CustomEvent, crypto 등)만 사용 가능하다.

## Architecture

```
src/
├── common.types.ts     ← 공유 타입 정의 (Bytes, PrimitiveType, DeepPartial, Type)
├── globals.ts          ← 전역 선언 (__DEV__ 빌드 플래그)
├── env.ts              ← 환경변수 접근 유틸리티 (env, parseBoolEnv)
├── index.ts            ← public API 재내보내기 + 확장 메서드 등록
├── errors/             ← 에러 클래스 (4개)
│   ├── sd-error.ts         ← 트리 구조 에러 체인 지원
│   ├── argument-error.ts   ← 인자 유효성 오류
│   ├── not-implemented-error.ts
│   └── timeout-error.ts
├── extensions/         ← 프로토타입 확장 (side-effect import 방식)
│   ├── arr-ext.ts          ← Array 확장 (readonly + mutable 메서드)
│   ├── arr-ext.types.ts    ← Array 확장 타입 선언
│   ├── arr-ext.helpers.ts  ← 내부 헬퍼 함수
│   ├── map-ext.ts          ← Map 확장 (getOrCreate 등)
│   └── set-ext.ts          ← Set 확장
├── features/           ← 비동기 제어 클래스 (3개)
│   ├── event-emitter.ts    ← 타입 안전 EventEmitter (EventTarget 기반)
│   ├── debounce-queue.ts   ← 비동기 디바운스 큐
│   └── serial-queue.ts     ← 비동기 직렬 큐
├── types/              ← 커스텀 값 타입 (4개)
│   ├── date-time.ts        ← 불변 DateTime (로컬 타임존)
│   ├── date-only.ts        ← 불변 날짜 전용 타입
│   ├── time.ts             ← 불변 시간 전용 타입
│   ├── uuid.ts             ← UUID 타입
│   └── lazy-gc-map.ts      ← LRU 기반 자동 만료 Map
└── utils/              ← 네임스페이스 유틸리티 함수 (12개)
    ├── obj.ts              ← clone, equal, merge (깊은 연산)
    ├── str.ts              ← 문자열 유틸 (한국어 조사 처리 포함)
    ├── num.ts              ← 숫자 유틸
    ├── bytes.ts            ← Uint8Array 유틸 (BytesUtils)
    ├── path.ts             ← Posix 경로 유틸
    ├── json.ts             ← JSON 직렬화/역직렬화
    ├── xml.ts              ← XML 파싱 (fast-xml-parser)
    ├── wait.ts             ← 비동기 대기 유틸
    ├── transferable.ts     ← Worker 전송 가능 객체 유틸
    ├── error.ts            ← 에러 메시지 추출 유틸
    ├── date-format.ts      ← 날짜 포맷 유틸 (types/ 내부용)
    ├── primitive.ts        ← 원시 타입 변환 유틸
    ├── template-strings.ts ← 태그드 템플릿 리터럴 유틸
    └── zip.ts              ← zip 압축/해제 (@zip.js/zip.js)
```

## Key Patterns

### utils 네임스페이스 임포트

`utils/` 하위 함수들은 네임스페이스로 내보내진다. 직접 named import 하지 않고 네임스페이스로 사용한다.

```typescript
import { obj, str, bytes, path } from "@simplysm/core-common";

const copied = obj.clone(source);
const merged = obj.merge(a, b);
const isEqual = obj.equal(x, y);
const suffix = str.getKoreanSuffix("홍길동", "이");
```

### 프로토타입 확장 활성화

`@simplysm/core-common`을 임포트하면 `Array`, `Map`, `Set` 프로토타입 확장이 자동 등록된다. 확장 메서드 타입은 전역으로 선언된다.

```typescript
import "@simplysm/core-common"; // 확장 등록 (side-effect import)

const item = [1, 2, 3].single((x) => x === 2);
const grouped = items.groupBy((x) => x.category);
const ordered = items.orderBy((x) => x.name);
const diffs = source.diffs(target, { keys: ["id"] });
const oneWayDiffs = newItems.oneWayDiffs(orgItems, "id");

// Map 확장
const map = new Map<string, number[]>();
const arr = map.getOrCreate("key", []);

// 가변(mutable) 메서드: 원본 배열을 직접 변경
items.remove((x) => x.deleted);
items.insert(0, newItem);
items.toggle(selectedItem);
```

### Array 확장 메서드 분류

- **불변(readonly) 메서드**: 새 배열 반환. `single`, `first`, `last`, `filterExists`, `ofType`, `groupBy`, `toMap`, `toMapAsync`, `toArrayMap`, `toSetMap`, `toMapValues`, `toObject`, `toTree`, `distinct`, `orderBy`, `orderByDesc`, `diffs`, `oneWayDiffs`, `merge`, `sum`, `min`, `max`, `shuffle`, `mapAsync`, `filterAsync`, `mapMany`, `mapManyAsync`, `parallelAsync`
- **가변(mutable) 메서드**: 원본 배열 직접 변경 후 반환. `remove`, `insert`, `toggle`, `clear`, `distinctThis`, `orderByThis`, `orderByDescThis`

### EventEmitter 패턴

`events`/`eventemitter3` 대신 이 패키지의 `EventEmitter`를 사용한다. EventTarget 기반으로 브라우저/Node.js 모두 지원한다.

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {}

const svc = new MyService();
svc.on("data", (data) => { /* data: string */ });
svc.emit("data", "hello");
svc.emit("done"); // void 타입은 인자 없이 호출
svc.dispose();   // 모든 리스너 정리
```

### 비동기 큐 패턴

`DebounceQueue`와 `SerialQueue`는 `EventEmitter`를 상속한다. 에러는 `"error"` 이벤트로 전파되며, 리스너가 없으면 `consola`로 로그 출력된다.

```typescript
import { DebounceQueue, SerialQueue } from "@simplysm/core-common";

// 디바운스 큐: 짧은 시간 내 다수 호출 → 마지막만 실행
const dq = new DebounceQueue(300);
dq.on("error", (err) => { /* 에러 처리 */ });
dq.run(() => { /* 300ms 후 실행 */ });

// 직렬 큐: 순차 실행 보장
const sq = new SerialQueue();
sq.run(async () => { /* 작업 1 */ });
sq.run(async () => { /* 작업 1 완료 후 실행 */ });

// using 문으로 자원 정리
using dq2 = new DebounceQueue(100);
```

### 값 타입 (DateTime / DateOnly / Time / Uuid)

모두 불변 객체다. 수정은 새 인스턴스를 반환하는 메서드로 수행한다.

```typescript
import { DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

const now = new DateTime();
const specific = new DateTime(2025, 1, 15, 10, 30, 0);
const parsed = DateTime.parse("2025-01-15 10:30:00");
const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");

const today = new DateOnly();
const uuid = Uuid.generate();
```

### SdError 에러 체인

원인 에러를 계층적으로 감싸 추적 가능한 에러 메시지를 생성한다.

```typescript
import { SdError } from "@simplysm/core-common";

try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
  // message: "사용자 로드 실패 => API 호출 실패 => 원본 메시지"
}
```

### LazyGcMap

LRU 방식으로 접근 시간을 갱신하고, 일정 시간 미접근 시 자동 삭제하는 Map이다. 사용 후 반드시 `dispose()`를 호출하거나 `using` 문을 사용한다.

```typescript
import { LazyGcMap } from "@simplysm/core-common";

using cache = new LazyGcMap<string, Data>({
  expireTime: 60_000,  // 60초 미접근 시 삭제
  onExpire: async (key, value) => { /* 만료 콜백 */ },
});

cache.set("key", data);
const val = cache.get("key"); // 접근 시간 갱신
```

### __DEV__ 빌드 플래그

`globals.ts`에 전역으로 선언된 `__DEV__`는 빌드 시 치환된다. 라이브러리 빌드에서는 치환되지 않으므로 이 패키지 소스 내부에서 직접 사용하지 않는다.

## Testing

**프레임워크**: Vitest

테스트 디렉토리가 `src/` 구조를 미러링한다: `tests/extensions/`, `tests/utils/`, `tests/errors/`, `tests/types/`

확장 메서드 테스트는 반드시 `@simplysm/core-common`을 side-effect import하여 확장을 활성화한다.

```typescript
import { describe, it, expect } from "vitest";
import "@simplysm/core-common"; // 확장 메서드 등록

describe("Array 프로토타입 확장", () => {
  describe("single()", () => {
    it("일치하는 단일 요소 반환", () => {
      expect([1, 2, 3].single((x) => x === 2)).toBe(2);
    });

    it("일치하는 요소가 여럿이면 오류 발생", () => {
      expect(() => [1, 1, 2].single((x) => x === 1)).toThrow();
    });
  });
});
```
