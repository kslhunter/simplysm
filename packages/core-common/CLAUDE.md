# CLAUDE.md — `@simplysm/core-common`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다. 이 파일은 본 패키지에만 해당하는 보강이다.

## 역할

모노레포 전체의 의존 뿌리. **DB·DOM·Node API에 의존하지 않는** 공통 도구만 모은다. 빌드 타겟은 `neutral`.

신규 유틸을 만들 때 "어디 둘지" 판단 기준:

- 환경 비종속 → **여기**.
- DOM·`window`·File API 등 → `core-browser`.
- `fs`·`child_process`·worker_threads 등 → `core-node`.

## 구조

| 경로            | 내용                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| `errors/`       | `SdError`(원인 체이닝·메시지 합성), `ArgumentError`, `NotImplementedError`, `TimeoutError`.  |
| `types/`        | 값 객체 — `Uuid`, `DateTime`, `DateOnly`, `Time`, `LazyGcMap`(WeakRef + FinalizationRegistry).|
| `extensions/`   | `Array`/`Set`/`Map` 프로토타입 확장. **import 시 부수 효과로 글로벌에 주입**된다 (`globals.ts`). |
| `features/`     | 동시성/이벤트 — `DebounceQueue`, `SerialQueue`, `EventEmitter`.                              |
| `utils/`        | 순수 함수 — `bytes`, `date-format`, `json`, `num`, `obj`, `path`, `primitive`, `str`, `template-strings`, `transferable`, `wait`, `xml`, `zip`. |
| `env.ts`        | `IS_BROWSER` / `IS_NODE` 런타임 감지.                                                        |
| `globals.ts`    | 확장 자동 로드 진입점.                                                                       |

외부 의존: `@zip.js/zip.js`, `fast-xml-parser`, `yaml`, `consola`. **다른 `@simplysm/*` 에는 의존 안 함.**

## 작업 시 주의

- 프로토타입 확장은 `index.ts` 에서 부수효과 import 로 적용된다. 새 확장 추가 시 같은 패턴(`extensions/*-ext.ts` + index 부수효과)을 유지.
- `Date` 객체 대신 `DateTime`/`DateOnly`/`Time` 사용. 직렬화는 `toString()` / `parse()` 왕복이 보장된다.
- 이 패키지에 환경 의존(`fs`, `window`, DB 드라이버 등)을 끌어들이지 마라. 빌드 타겟이 `neutral` 인 이유.
