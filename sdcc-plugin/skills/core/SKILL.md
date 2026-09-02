---
name: core
description: "@simplysm/core-common·core-browser·core-node·storage(값 타입·컬렉션 확장·obj·json·에러·로깅·브라우저 파일/DOM/IndexedDB·Node fs/프로세스/감시/Worker·FTP/SFTP)의 인덱스. Use when DateTime·DateOnly·Time·Uuid, Array/Map/Set 확장 메서드, obj.clone·equal·merge, json 직렬화, SdError·err, createLogger·setupConsola, downloadBlob·openFileDialog·fetchUrlBytes, IndexedDbStore, fsx·cpx·pathx·FsWatcher·Worker, StorageFactory 를 쓰거나 해석하는 모든 작업 — 착수 전에 먼저 읽는다. 유틸을 안다고 생각해도 읽는다(설치된 버전의 null 처리·변이 규약이 학습 지식과 다르다)."
---

@simplysm 기반 유틸 패키지 사용 안내입니다. 네 패키지 모두 `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지와, 소스 한 파일만 읽어서는 놓치는 규약만 담습니다. `createLogger` 로만 로깅한다는 규칙은 세션에 주입된 rules 가 정본입니다.

## 소스 위치

- `node_modules/@simplysm/core-common/src/` — 브라우저·Node 공용. 값 타입(`DateTime`/`DateOnly`/`Time`/`Uuid`, `dt`), 에러(`SdError`/`ArgumentError`/`NotImplementedError`/`TimeoutError`, `err`), 프로토타입 확장(`extensions/`), 네임스페이스 `obj`/`json`/`xml`/`bytes`/`transfer`/`str`/`num`/`path`/`primitive`/`wait`, `EventEmitter`/`DebounceQueue`/`SerialQueue`/`LazyGcMap`, `ZipArchive`, `env`/`parseBoolEnv`/`createLogger`, 템플릿 태그(`js`/`ts`/`html`/`tsql`/`mysql`/`pgsql`), 타입(`Bytes`/`PrimitiveType*`/`DeepPartial`/`Type`).
- `node_modules/@simplysm/core-browser/src/` — `Element`/`HTMLElement` 확장, `copyElement`/`pasteToElement`, `getBounds`, `downloadBlob`/`openFileDialog`/`fetchUrlBytes`, `IndexedDbStore`/`IndexedDbVirtualFs`.
- `node_modules/@simplysm/core-node/src/` — `fsx`, `pathx`, `cpx`, `FsWatcher`, `setupConsola`/`PrettyReporter`/`createFileReporter`, `Worker.create`/`createWorker`.
- `node_modules/@simplysm/storage/src/` — `StorageFactory.connect(type, config, fn)`, `FtpStorageClient`/`SftpStorageClient`.
- 공개 API 는 각 패키지의 `src/index.ts`.

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- import 부수효과: `@simplysm/core-common` 을 어떤 심볼로든 import 하면 `Array`/`ReadonlyArray`/`Set`/`Map` 프로토타입 확장이 전역 설치됩니다(`single`/`first`/`last`/`filterExists`/`groupBy`/`toMap`/`distinct`/`orderBy`/`diffs`/`merge`/`toTree`/`sum` 등). `@simplysm/core-browser` 도 `Element`/`HTMLElement` 확장을 설치하되 `typeof Element !== "undefined"` 가드라 SSR 경로에선 없습니다.
  - 원본을 바꾸는 메서드는 이름으로 구분됩니다: Array `distinctThis`/`orderByThis`/`orderByDescThis`/`insert`/`remove`/`toggle`/`clear`, Set `adds`/`toggle`, Map `update`. 나머지(`distinct`, `orderBy`, …)는 새 배열.
  - `single()` 은 2개 이상이면 throw, `toMap`/`toObject` 는 중복 키 throw, `parallelAsync` 는 `Promise.all`(하나 reject 면 전체 즉시 reject), `mapAsync`/`filterAsync` 는 순차. 객체 배열 `distinct`/`groupBy` 는 깊은 비교 O(n²) — 대량이면 `keyFn` 또는 `matchAddress`.
- null-free 규칙: `json.parse` 는 모든 JSON null 을 `undefined` 로 바꾸고 `{ __type__, data }` 태그로 `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Set`/`Map`/`Error`/`Uint8Array` 를 복원합니다(`json.stringify` 와 짝). `redactBytes: true` 로 만든 JSON 은 복원 불가. `obj.equal` 은 값이 null/undefined 인 속성을 비교에서 제외합니다.
- `DateTime`/`DateOnly`/`Time` 은 로컬 타임존 기준 **불변** — `setX`/`addX` 는 새 인스턴스를 반환하니 결과를 받아 씁니다. `month` 는 1-12. `DateOnly.parse` 는 `yyyy-MM-dd`/`yyyyMMdd` 만 타임존 무관하게 읽고 그 외 형식은 오프셋 보정을 거치므로, 서버·클라이언트 타임존이 다르면 `yyyy-MM-dd` 로 주고받습니다. `Time` 은 하루 범위로 순환(음수·24시간 초과 정규화). 포맷 토큰은 C# 계열(`yyyy-MM-dd HH:mm:ss.fff`, `tt`/`hh`, `ddd` 요일 한글).
- `obj.merge` 는 원본을 안 바꾸고 배열은 기본 교체(`arrayProcess: "concat"` 이면 합집합), `useDelTargetNull` 이 true 일 때만 target 의 null 이 키 삭제. `obj.merge3` 의 키별 옵션 `keys`/`excludes`/`ignoreArrayIndex` 는 그 키 값 비교의 `equal` 옵션(`topLevelIncludes`/`topLevelExcludes`/`ignoreArrayIndex`)으로 쓰입니다. `obj.clone` 은 getter 를 값으로 평가해 복사하고 WeakMap/WeakSet 은 빈 객체가 됩니다.
- `SdError(cause, ...messages)` 는 `cause` 체인과 stack 을 잇고 메시지를 상위→원인 순 `" => "` 로 결합. `catch (e: unknown)` 에서는 `err.message(e)`/`err.stack(e)`, RPC 로 넘어온 plain object 는 `err.fromObject`.
- `createLogger(tag)` 는 lazy Proxy 라 모듈 레벨에서 선언해도 이후 `setupConsola` 설정이 반영됩니다. `consola.withTag()` 직접 호출은 호출 시점 설정을 스냅샷으로 고정하니 발견하면 `createLogger` 로 교체. `setupConsola()` 는 Node 서버 진입점에서 1회, CLI 는 `setupConsola({ cli: true })`, 브라우저·Capacitor 는 호출하지 않습니다(Node 전용). prod(`DEV` 가 아닌 환경)에서는 파일 reporter 만이라 콘솔에 아무것도 안 찍히고 `.logs/app.<날짜>.log` 에 남습니다.
- lint 가 막는 것: `Buffer`·`buffer`·`events`·`eventemitter3` import(→ `Uint8Array`/`bytes`, `EventEmitter`), `process.env`·`import.meta.env` 직접 접근(→ `env("KEY")`), `env("NODE_ENV")`(→ `parseBoolEnv(env("DEV"))`), `=== undefined`(→ `== null`).
- `LazyGcMap` 은 사용 후 `dispose()` 필수(GC 타이머 누수). `SerialQueue.dispose()` 는 실행 중인 함수를 중단하지 않고 대기 큐만 비웁니다. `DebounceQueue`/`SerialQueue` 의 콜백 오류는 `error` 리스너가 없으면 logger 로만 남고 후속 작업은 계속됩니다.
- `wait.until(fn, ms, maxCount)` 는 `maxCount` 생략 시 무제한으로 돌고, 넘기면 `TimeoutError` — `wait.until` 폴링에는 `maxCount` 를 줍니다.
- core-browser: `downloadBlob` 은 파일명을 sanitize 하고 `[`·`]` 도 제거(빈 값이면 `download`). `openFileDialog` 는 취소 시 `undefined`. `fetchUrlBytes` 는 `Content-Length` 와 수신량이 다르면 throw. `getRelativeOffset(parent)` 는 부모 스크롤·중간 border·transform 을 반영한 좌표. `IndexedDbStore.withStore` 는 `fn` 이 throw 하면 트랜잭션을 abort.
- core-node: `fsx.*` 는 실패 시 경로를 담은 `SdError`, `fsx.rm` 은 Windows 에서 `rd /s /q` 우선 + 재시도(동기 `rmSync` 는 재시도 없음), `fsx.write` 는 상위 디렉토리 자동 생성 + `flush`. `cpx.spawn` 은 exit≠0 이면 기본 throw(`reject: false` 로 결과 반환), 반환 `SpawnProcess` 는 await 가능하면서 `kill`/`pid` 접근 가능. `FsWatcher.watch` 는 glob 의 base 디렉토리를 감시하고 이벤트를 원본 패턴으로 재매칭하며 같은 파일의 연속 이벤트를 병합(`add+unlink` 상쇄 등), Windows EPERM 은 3회 자동 복구. `Worker.create` 는 개발(`.ts`)에서 `worker-dev-proxy` 로 tsx 로드, 워커 쪽은 `createWorker(methods)` 가 `parentPort` 없으면 throw 하고 stdout 을 메인으로 전달.
- storage: `StorageFactory.connect(type, config, fn)` 이 연결·종료를 자동 처리(콜백 throw 도 종료). `exists()` 는 네트워크·권한 오류를 포함해 모든 예외에서 `false`. SFTP 는 `password` 없으면 `~/.ssh/id_ed25519` → SSH agent 순으로 키 인증. `mkdir` 은 `-p` 동작.
