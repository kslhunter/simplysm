# @simplysm/core-common

공통 유틸리티(타입·에러·큐·이벤트·변환·확장 메서드·환경변수). simplysm 모든 패키지의 공용 기반.

## 사용 트리거 인덱스

- **에러 클래스** — throw 시 트리 메시지/원인 체인 필요할 때. `SdError`, `ArgumentError`, `NotImplementedError`, `TimeoutError`.
- **날짜/시간/UUID/캐시 타입** — `DateTime`, `DateOnly`, `Time`, `Uuid`, `LazyGcMap` 사용 시. (자세히: [types.md](./types.md))
- **큐·이벤트 features** — 디바운스·직렬 큐, 타입 안전 EventEmitter. (자세히: [features.md](./features.md))
- **유틸리티 네임스페이스** — `obj`, `str`, `num`, `bytes`, `path`, `json`, `xml`, `wait`, `transfer`, `err`, `dt`, `primitive`. (자세히: [utils.md](./utils.md))
- **Array/Set/Map 전역 확장 메서드** — `.single()`, `.toMap()`, `.toTree()`, `.distinct()`, `Set.adds()`, `Map.getOrCreate()` 등. (자세히: [extensions.md](./extensions.md))
- **환경변수** — `env(key)`, `env(key, value)`, `parseBoolEnv(v)`. `process.env` 우선, fallback `import.meta.env`.
- **템플릿 문자열 태그** — IDE 하이라이팅 + indent trim. `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql`. 동작은 모두 동일(문자열 결합 + 들여쓰기 정규화).
- **ZIP 처리** — `ZipArchive(data?)`: `get/exists/write/extractAll/compress/close`. 사용 후 반드시 `await archive.close()`.
- **공통 타입** — `Bytes` (= `Uint8Array`), `PrimitiveTypeMap/Str/Type` (string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes), `DeepPartial<T>`, `Type<T>` (생성자 타입).

## 에러 클래스

```typescript
new SdError(cause: Error, ...messages: string[])
new SdError(...messages: string[])
// 메시지는 역순 결합: "상위 => 하위 => 원인". cause stack을 현재 stack에 append.

new ArgumentError(argObj)
new ArgumentError(message, argObj)
// 인자 객체를 YAML 형식으로 메시지에 포함.

new NotImplementedError(message?)   // "미구현: <message>"
new TimeoutError(count?, message?)  // "대기 시간 초과(N회 시도): <message>". wait.until 에서 자동 throw.
```

모두 `SdError` 상속. `name` 자동 설정.

## 환경변수

```typescript
env("PORT")             // string | undefined (process.env → import.meta.env)
env("PORT", "3000")     // void (process.env 에 기록, process 없으면 무시)
parseBoolEnv(v)         // "true"|"1"|"yes"|"on" → true (대소문자 무시)
```

## 템플릿 문자열 태그

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";

const code = ts`
  interface User { name: string; }
`;
// → "interface User { name: string; }" (앞뒤 빈 줄·공통 들여쓰기 제거)
```

모두 동일 함수, IDE 하이라이팅 차별화 목적.
