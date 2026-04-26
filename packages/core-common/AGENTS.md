# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/core-common/README.md`를 참조한다.

## Package Overview

`@simplysm/core-common`은 브라우저와 Node.js 양쪽에서 사용하는 플랫폼 중립 공통 패키지다. 다른 `@simplysm/*` 패키지에 의존하지 않는 리프 패키지이며, 값 타입, 에러 타입, 프로토타입 확장, 비동기 큐, 직렬화·문자열·객체 유틸리티를 제공한다.

소스 파일 수: `src/` 하위 TypeScript 파일 37개.

## Architecture

```text
src/
  common.types.ts        공용 primitive/type utility 정의
  env.ts                 환경변수 접근 래퍼
  globals.ts             전역 타입·프로토타입 확장 선언 진입점
  index.ts               공개 API와 side-effect 확장 진입점
  errors/                SdError 기반 에러 클래스
  extensions/            Array/Map/Set 프로토타입 확장 구현과 타입 선언
  features/              EventEmitter, DebounceQueue, SerialQueue
  types/                 DateTime, DateOnly, Time, Uuid, LazyGcMap 값 타입
  utils/                 namespace export되는 순수 유틸리티
```

`index.ts`는 `extensions/arr-ext`를 side-effect로 import한다. `arr-ext`가 `map-ext`와 `set-ext`를 다시 import하므로, 패키지 공개 진입점을 import하면 Array/Map/Set 확장이 함께 등록된다.

## Key Patterns

### 값 타입은 불변 객체처럼 사용한다

`DateTime`, `DateOnly`, `Time`, `Uuid`는 내부 값을 `tick` 또는 문자열로 보관하고, 산술·변환 메서드는 새 인스턴스를 반환한다. 소비자 문서와 예제는 네이티브 `Date` 대신 공개 값 타입을 우선 사용한다.

```typescript
const nextDay = dateOnly.addDays(1);
const iso = dateTime.toFormatString("yyyy-MM-dd HH:mm:ss");
```

### 프로토타입 확장은 타입 선언과 구현을 분리한다

`extensions/*.types.ts`는 전역 인터페이스 선언과 반환 타입을 담고, `extensions/*-ext.ts`는 실제 메서드를 `Object.defineProperties`로 등록한다. 새 확장 메서드를 추가할 때는 구현 파일과 타입 선언을 함께 갱신한다.

```typescript
declare global {
  interface Array<TItem> extends ReadonlyArrayExt<TItem>, MutableArrayExt<TItem> {}
}
```

### 유틸리티 모듈은 namespace import를 전제로 export된다

`obj`, `str`, `num`, `bytes`, `path`, `json`, `xml`, `wait`, `transfer`, `err`, `dt`, `primitive`는 `export * as ...` 형태로 공개된다. 소비자 문서에서는 하위 모듈 경로 대신 공개 API의 namespace 사용을 기준으로 설명한다.

```typescript
import { obj, str } from "@simplysm/core-common";

const cloned = obj.clone(source);
const name = str.toPascalCase("user_name");
```

### 에러는 `SdError` 체인을 기준으로 구성한다

`SdError`는 원인 `Error`와 메시지 배열을 받아 `상위 => 하위 => 원인` 순서의 메시지를 만든다. `ArgumentError`, `NotImplementedError`, `TimeoutError`는 모두 `SdError`를 상속한다.

```typescript
throw new SdError(cause, "API 호출 실패", "사용자 로드 실패");
```

### Worker 전송은 태그 기반 직렬화를 사용한다

`utils/transferable.ts`는 `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Map`, `Set`을 태그 객체 또는 전송 가능한 객체로 변환한다. 순환 참조가 있으면 경로 정보를 포함한 `TypeError`를 발생시킨다.

## Testing

테스트는 `packages/core-common/tests`에 기능별 `*.spec.ts` 파일로 둔다. 프로토타입 확장은 공개 진입점 import 뒤 전역 메서드가 등록되는지 함께 확인한다.

```text
tests/
  arr-ext.spec.ts
  date-time.spec.ts
  lazy-gc-map.spec.ts
  obj.spec.ts
  ...
```

