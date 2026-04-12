# sd-cli 리팩토링 분석 리포트

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/` |
| 분석 일시 | 2026-04-11 |
| 파일 수 | 71개 TypeScript 소스 파일 (~13,700줄) |
| 발견 이슈 | 7건 (Critical 2, Medium 4, Low 1) |

---

## Critical

### DESIGN-001: server-build.worker.ts God Module

```
id: DESIGN-001
severity: Critical
category: 설계
location: packages/sd-cli/src/workers/server-build.worker.ts
title: 4가지 독립 관심사가 단일 워커에 혼재 (516줄)
```

**description**: `server-build.worker.ts`에 esbuild 번들링, TypeScript 타입 체크, 파일 시스템 감시 & 무효화, 프로덕션 산출물 생성이 모두 포함되어 있다. `startWatch` 함수(lines 359-496)에 7개 try-catch, 4개 상태 머신(esbuildContext, publicWatcher, srcWatcher, lastMetafile), 2개 독립 onChange 핸들러가 존재하여 복잡도가 과도하다. `LOGIC-001` 주석(line 435)으로 리소스 해제 관련 미묘한 버그 가능성이 표시되어 있으며, 비교 대상인 library-build.worker.ts(229줄, 1관심사), ngtsc-build.worker.ts(369줄, 2관심사)에 비해 2배 이상 크다.

**suggestion**: 3개 모듈로 분리한다.
- `server-esbuild-context.ts` — esbuild context 생성/관리 및 metafile 추적
- `server-watch-manager.ts` — FsWatcher 감시 루프, 변경 필터링, context 재생성 로직
- `server-artifacts.ts` — .config.json, public/ 복사, PM2/volta/mise 파일 생성 (`generateProductionFiles` 관련)
- `server-build.worker.ts`는 위 모듈을 조합하는 경량 워커 셸로 유지

---

### DESIGN-002: commands/publish/index.ts God Module

```
id: DESIGN-002
severity: Critical
category: 설계
location: packages/sd-cli/src/commands/publish/index.ts
title: 5개 이상의 독립적 페이즈가 단일 함수에 밀결합 (455줄)
```

**description**: `runPublish()` 함수 하나에 검증(CLI 옵션, npm/SSH 인증), 버전 관리(업그레이드 계산, 파일 업데이트), Git 워크플로(status 확인, Claude CLI 자동 커밋, 태깅, 푸시), 배포 실행(패키지별 npm/local/storage), 후처리(postPublish 스크립트)가 순차 실행된다. Git 작업, 배포 로직, 환경변수 처리가 하나의 함수에 밀결합되어 개별 페이즈를 독립적으로 테스트하거나 재사용할 수 없다.

**suggestion**: 페이즈별 모듈로 분리한다.
- `publish/git-phase.ts` — git 상태 확인, 커밋, 태그, 푸시
- `publish/deployment-phase.ts` — 패키지별 배포 오케스트레이션
- `publish/post-publish-phase.ts` — 후처리 훅 실행
- `runPublish()`는 페이즈를 순차 호출하는 경량 오케스트레이터로 유지

---

## Medium

### DESIGN-003: Orchestrator 간 중복 패턴

```
id: DESIGN-003
severity: Medium
category: 설계
location: packages/sd-cli/src/orchestrators/
title: 4개 Orchestrator에서 환경변수·진단·작업 생성 패턴이 독립 반복 구현
```

**description**: Build, Typecheck, Watch, Dev 4개 Orchestrator에서 동일한 패턴이 반복된다.
1. **환경변수 설정**: BuildOrchestrator(lines 163-165)와 DevOrchestrator(lines 62-63)가 동일한 `getVersion() → baseEnv` 로직을 각각 구현 (DEV 값만 다름).
2. **진단 메시지 집계·포맷팅**: BuildOrchestrator(lines 470-494)와 TypecheckOrchestrator(lines 364-367)가 `ts.sortAndDeduplicateDiagnostics → ts.formatDiagnosticsWithColorAndContext` 동일 호출.
3. **작업 생성 → 동시성 제어**: Build/Typecheck 모두 task 배열 생성 후 `runWithConcurrency()` 호출 → 에러 핸들링 동일 구조.
4. **BaseOrchestrator 시그니처 불일치**: `_initializeMode`의 `options: string[]` 파라미터를 BuildOrchestrator만 사용하고 Watch/Dev는 무시.

**suggestion**:
- 진단 포맷팅 로직을 `utils/diagnostic-utils.ts`에 공통 함수로 추출
- 환경변수 설정을 BaseOrchestrator로 올려 dev 여부만 파라미터화
- `_initializeMode` 시그니처에서 `options`를 제거하고, BuildOrchestrator가 자체적으로 처리

---

### STRUCT-001: Worker 초기화 보일러플레이트 중복

```
id: STRUCT-001
severity: Medium
category: 구조
location: packages/sd-cli/src/workers/ (4개 워커 파일)
title: 4개 워커에서 ~150줄의 초기화 보일러플레이트가 동일 반복
```

**description**: library-build, ngtsc-build, server-build, client 4개 워커 모두 동일한 초기화 패턴(setupWorkerConsola, logger 생성, cleanup 함수 정의, registerCleanupHandlers, guardStartWatch, watchInfo 변수)을 ~35-45줄씩 반복한다. 총 ~150줄의 기계적 중복이며, 새 워커 추가 시에도 동일 보일러플레이트를 복사해야 한다.

**suggestion**: `workers/shared-worker-lifecycle.ts` 유틸리티를 추출하여 공통 초기화를 캡슐화한다.
```typescript
export function setupWorkerLifecycle(
  workerName: string,
  cleanupFn: () => Promise<void>,
) {
  setupWorkerConsola();
  const logger = consola.withTag(`sd:cli:${workerName}:worker`);
  registerCleanupHandlers(cleanupFn, logger);
  return { logger, guardStartWatch: createOnceGuard("startWatch") };
}
```

---

### DESIGN-004: capacitor/capacitor.ts 모놀리식 클래스

```
id: DESIGN-004
severity: Medium
category: 설계
location: packages/sd-cli/src/capacitor/capacitor.ts (618줄)
title: Capacitor 클래스에 라이프사이클·npm 설정·파일 생성·빌드 등 모든 기능이 집중
```

**description**: 단일 `Capacitor` 클래스에 라이프사이클 오케스트레이션(`initialize`, 98-151), npm 설정(`_initCap` + `_setupNpmConf`, 251-393), 설정 파일 생성(`_writeCapConf`, 398-431), URL 조작(`_updateServerUrl`, 510-525), Gradle 빌드 실행(`build`, 539-585)이 모두 포함되어 있다. `initialize()` 메서드가 6개 하위 작업을 순차 실행하며, `run()`(dev)과 `build()`(production)의 공유 인프라(잠금 파일, 도구 감지)가 혼재되어 있다.

**suggestion**: 관심사별 모듈을 분리한다.
- `capacitor-npm-config.ts` — package.json 생성/pnpm workspace 관리
- `capacitor-config-writer.ts` — capacitor.config.ts 템플릿 생성 및 정규식 기반 URL 업데이트
- `Capacitor` 클래스는 경량 파사드로 유지하며 위 모듈을 조합

---

### STRUCT-002: Worker 감시 경로 수집 및 변경 필터링 중복

```
id: STRUCT-002
severity: Medium
category: 구조
location: packages/sd-cli/src/workers/ (library-build, ngtsc-build, server-build)
title: 3개 워커에서 감시 경로 수집 ~75줄 + 변경 필터링 ~45줄 중복 (총 ~120줄)
```

**description**: 3개 워커(library-build:162-172, ngtsc-build:268-292, server-build:389-412)에서 동일한 감시 경로 수집 패턴(`collectDeps → watchPaths 배열 구성 → FsWatcher.watch`)이 반복된다(glob 패턴만 워커마다 다름). 또한 파일 변경 필터링(`hasFileAddOrRemove 확인 → lastSourceFilePaths 교차 → 리빌드 건너뜀`)도 3곳에서 동일 구조로 반복된다.

**suggestion**: 두 개의 공통 유틸리티를 추출한다.
- `workers/build-watch-paths.ts` — 워커 타입별 glob 패턴을 설정으로 받아 감시 경로를 생성하는 `buildWatchPaths(config)` 함수
- `workers/build-change-filter.ts` — 파일 변경 관련성을 판단하는 `shouldSkipRebuild(changes, sourceFilePaths, logger)` 함수

---

## Low

### ARCH-001: deps/ 디렉토리 관심사 혼재

```
id: ARCH-001
severity: Low
category: 아키텍처
location: packages/sd-cli/src/deps/
title: 개발 시점 의존성 관리와 빌드 시점 산출물 생성이 같은 디렉토리에 혼재
```

**description**: `deps/` 디렉토리에 개발 시점 의존성 관리(`replace-deps.ts`, `replace-deps-resolve.ts`, `collect-deps.ts` — 소비자: BaseOrchestrator, sd-cli.ts)와 빌드 시점 산출물 생성(`server-production-files.ts` — 소비자: server-build.worker.ts만)이 공존한다. 두 관심사는 서로 참조하지 않으며 사용처도 다르다.

**suggestion**: 서브디렉토리로 분리하여 관심사를 명확히 한다.
```
deps/
├── replace-deps/
│   ├── replace-deps.ts
│   ├── replace-deps-resolve.ts
│   └── collect-deps.ts
└── server-externals/
    └── server-production-files.ts
```
