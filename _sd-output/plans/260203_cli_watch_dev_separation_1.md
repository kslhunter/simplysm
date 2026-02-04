# CLI watch/dev 명령어 분리 기획서

## 개요

현재 CLI의 `watch` 명령어는 library, client, server 모든 타겟을 처리하고 있다. 이를 두 개의 명령어로 분리하여 역할을 명확히 한다:

- **`watch`**: Library 패키지(node/browser/neutral)의 JS 빌드와 .d.ts 생성
- **`dev`**: Client와 Server 패키지 실행 (Vite dev server, Fastify runtime)

## 범위

### 포함

- `sd-cli.ts`에 `dev` 명령어 추가
- `watch.ts` 명령어에서 client/server 로직 분리
- 새로운 `dev.ts` 명령어 파일 생성
- 기존 Worker 파일들은 재사용 (workers/watch.worker.ts, workers/server-build.worker.ts, workers/server-runtime.worker.ts, workers/dts.worker.ts)

### 제외

- Worker 파일 수정 (기존 로직 유지)
- `build` 명령어 변경 없음
- sd.config.ts 타입 정의 변경 없음

## 주요 기능

### 1. `watch` 명령어 (수정)

**용도**: Library 패키지의 JS 빌드 및 타입 정의 파일(.d.ts) 생성

**대상 타겟**:
- `node`
- `browser`
- `neutral`

**실행 Worker**:
- `workers/watch.worker.ts` (esbuild watch)
- `workers/dts.worker.ts` (TypeScript .d.ts 생성)

**사용 예시**:
```bash
pnpm watch                    # 모든 library 패키지
pnpm watch solid core-common  # 특정 패키지만
```

**빈 타겟 처리**: library 패키지가 없으면 경고 메시지 출력 후 정상 종료 (exit code 0)

### 2. `dev` 명령어 (신규)

**용도**: Client 및 Server 패키지 실행 (개발 모드)

**대상 타겟**:
- `client` (Vite dev server)
- `server` (Fastify 런타임)

**실행 Worker**:
- `workers/watch.worker.ts` (client용 Vite server)
- `workers/server-build.worker.ts` (server 빌드)
- `workers/server-runtime.worker.ts` (server 런타임)

**사용 예시**:
```bash
pnpm dev                      # 모든 client/server 패키지
pnpm dev solid-demo           # 특정 패키지만
```

**빈 타겟 처리**: client/server 패키지가 없으면 경고 메시지 출력 후 정상 종료 (exit code 0)

**옵션**: `-o` (또는 `--options`) 플래그로 sd.config.ts에 옵션 전달 (watch와 동일)

**Capacitor 처리**: client 타겟 중 `capacitor` 설정이 있는 패키지에 대해 Capacitor 초기화 수행

### 3. Server-Client 연결 및 URL 출력 처리

**메인(dev.ts)에서 URL 출력을 통합 관리한다:**

- 모든 Worker는 `serverReady` 이벤트로 포트를 메인에 전달
- 메인에서는 포트가 어디서 오든 동일한 출력 로직 사용
- Worker 내부의 standalone/서버연결 구분은 Worker 레벨 구현 상세이며, 메인에서는 신경 쓰지 않음

**URL 출력 로직:**

1. **server 빌드가 있는 경우**: Server Runtime에서 받은 포트로 URL 출력
   - client는 server 프록시를 경유하여 접근
   - 출력 예: `http://localhost:{server-port}/{client-name}/`

2. **server 빌드가 없는 경우**: Client Worker에서 받은 포트로 URL 출력
   - client가 단독으로 Vite dev server 실행
   - 출력 예: `http://localhost:{client-port}/{client-name}/`

**Server-Client 프록시 연결:**

server 타겟과 client 타겟이 연결되어 있을 때 (client.server = "server-package-name"):
- Server Runtime이 Client Vite 포트를 프록시로 연결
- 이 동작은 `dev` 명령어에서만 필요

### 4. 공통 유틸리티 파일들

**4.1 `utils/output-utils.ts`** - 출력 유틸리티

**포함 내용**:
- `printErrors(results)` 함수: 에러만 출력 (결과 배열에서 status가 "error"인 항목)
- `printServers(results, serverClientsMap)` 함수: 서버 URL만 출력 (결과 배열에서 status가 "server"인 항목)

**출력 호출 위치**:
- `watch.ts`: Listr 완료 후 `printErrors(results)` 호출
- `dev.ts`: Listr 완료 후 `printErrors(results)` + `printServers(results, serverClientsMap)` 호출

**기존 함수와의 관계**:
- 기존 `printErrorsAndServers` 함수를 두 함수로 분리
- 에러 출력 로직과 서버 URL 출력 로직을 독립적으로 사용 가능

---

**4.2 `utils/listr-manager.ts`** - Listr 배치 관리

**포함 내용**:
- `RebuildListrManager` 클래스: EventEmitter를 확장하여 리빌드 시 Listr 실행 관리
  - `batchComplete` 이벤트: 배치 완료 시 발생 (출력 로직은 각 명령어에서 이벤트 리스너로 처리)

---

**4.3 `utils/worker-events.ts`** - Worker 이벤트 처리

**포함 내용**:
- `registerWorkerEventHandlers` 함수: Worker 이벤트 핸들러 등록 (buildStart, build, error만 - serverReady는 포함하지 않음)
- `BuildEventData` 타입: Worker 빌드 완료 이벤트 데이터
- `ErrorEventData` 타입: Worker 에러 이벤트 데이터
- `ServerReadyEventData` 타입: Worker 서버 준비 이벤트 데이터
- `ServerBuildEventData` 타입: Server Build 완료 이벤트 데이터

---

**4.4 `utils/package-utils.ts`** - 패키지 유틸리티

**포함 내용**:
- `filterPackagesByTargets` 함수: 패키지 설정에서 scripts 타겟 제외 후 필터링
- `PackageResult` 타입: 패키지 빌드 결과 상태

### 5. 동시 실행 시나리오

개발 중 일반적인 사용 패턴:
```bash
# 터미널 1: Library 빌드 watch
pnpm watch

# 터미널 2: Client/Server 개발 서버
pnpm dev solid-demo
```

`dev` 명령어는 client/server만 실행하며, 의존하는 library 패키지는 별도 터미널에서 `watch` 명령어로 실행해야 한다.

## 결정사항

| 번호 | 항목 | 결정 내용 |
|------|------|-----------|
| 1 | Library 의존성 빌드 | 분리 실행 - `dev`는 client/server만, library는 별도 `watch` 명령어로 |
| 2 | 옵션 플래그 동작 | 동일한 옵션 체계 - 두 명령어 모두 `-o` 옵션 지원 |
| 3 | scripts 타겟 처리 | 동일하게 제외 유지 - watch와 dev 모두에서 scripts 타겟 제외 |
| 4 | 빈 타겟 실행 처리 | 경고 메시지 출력 후 정상 종료 (exit code 0) |
| 5 | RebuildListrManager 처리 | `utils/listr-manager.ts`에 배치, EventEmitter 확장하여 `batchComplete` 이벤트 발생 |
| 6 | printErrors/printServers 처리 | `utils/output-utils.ts`에 배치 - 기존 `printErrorsAndServers`를 `printErrors`(에러 출력), `printServers`(서버 URL 출력) 두 함수로 분리. watch.ts는 printErrors만, dev.ts는 둘 다 호출 |
| 7 | Capacitor 처리 | `dev` 명령어에 포함 - client 타겟과 함께 이동 |
| 8 | filterPackagesByTargets 처리 | `utils/package-utils.ts`에 배치, 각 명령어에서 추가 인라인 필터링 수행 |
| 9 | registerWorkerEventHandlers 처리 | `utils/worker-events.ts`에 배치 - buildStart, build, error 이벤트만 처리 (serverReady는 각 명령어에서 별도 등록) |
| 10 | 서버 URL 출력 시점 | 초기 빌드 및 리빌드 완료 시마다 서버 URL 출력 |
| 11 | Server 리빌드 처리 | Server Build는 RebuildListrManager에 등록 (다른 빌드와 병렬 Listr 표시), Server Runtime 리빌드 시 dev.ts의 Server Build 이벤트 핸들러에서 기존 Runtime 종료 전에 consola.info로 '서버 재시작 중...' 메시지 출력 (Worker 파일은 수정하지 않음), URL은 배치 완료 시 printServers에서 출력 |
| 12 | Worker 파일 경로 표기 | `workers/` 폴더 경로로 명시 (workers/watch.worker.ts 등) |

## 미결 사항

없음
