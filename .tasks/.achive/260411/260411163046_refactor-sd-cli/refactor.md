# sd-cli 리팩토링 분석 리포트

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli/src/` |
| 분석 일시 | 2026-04-11 |
| 파일 수 | 71개 TypeScript 소스 파일 |
| 발견 이슈 | 3건 (Critical: 1, Medium: 0, Low: 2) |

---

## 이슈 목록

### STRUCT-001

```
id: STRUCT-001
severity: Critical
category: 구조
location: packages/sd-cli/src/
title: src/ 전체의 파일 배치가 도메인 경계를 반영하지 못함 — utils/가 41개 파일의 catch-all이 되고, 도메인 디렉토리는 관련 파일을 충분히 포함하지 못함
description: |
  src/ 전체에서 도메인별 파일 배치가 불일치한다. 두 가지 문제가 동시에 존재한다:

  1. utils/가 catch-all — 41개 파일(5,295줄)이 8개 이상의 서로 다른 도메인에 속함
  2. 도메인 디렉토리가 불완전 — angular/(2파일)에 플러그인만 있고, 핵심 컴파일러 로직 4개는 utils/에 분산

  ■ 도메인별 파일 분산 현황:

  Angular 도메인 (6파일이 2곳에 분산):
    - src/angular/                     → vite-angular-plugin.ts, client-transform-stylesheet.ts
    - src/utils/                       → angular-compiler.ts(560줄), angular-build-pipeline.ts(401줄),
                                         angular-build.ts(32줄), ngtsc-build-core.ts(186줄)
    - 소비자: ngtsc-build.worker, vite-angular-plugin이 utils/의 Angular 파일을 import

  Esbuild 도메인 (5파일이 utils/에만 존재):
    - src/utils/                       → esbuild-config.ts(239줄), esbuild-client-config.ts(230줄),
                                         esbuild-scss-plugin.ts(48줄), esbuild-index-html.ts(119줄),
                                         esbuild-pwa.ts(139줄)
    - 소비자: client.worker, server-build.worker

  HMR/Dev서버 도메인 (3파일이 utils/에만 존재):
    - src/utils/                       → hmr-client-script.ts(74줄), hmr-service.ts(178줄),
                                         dev-http-server.ts(149줄)
    - 소비자: client.worker 전용

  Lint 도메인 (3파일이 utils/에만 존재):
    - src/utils/                       → lint-core.ts(205줄), lint-with-program.ts(185줄), lint-utils.ts(17줄)
    - 소비자: workers(library-build, ngtsc-build, server-build), lint.worker

  Typecheck 도메인 (2파일이 utils/에만 존재):
    - src/utils/                       → typecheck-serialization.ts(84줄), typecheck-non-package.ts(97줄)
    - 소비자: workers, TypecheckOrchestrator, engines/types

  Worker/Engine 인프라 (4파일이 utils/에, 2파일이 runtime/에 분산):
    - src/runtime/                     → ResultCollector.ts(45줄), SignalHandler.ts(42줄)
    - src/utils/                       → rebuild-manager.ts(80줄), worker-utils.ts(54줄),
                                         worker-events.ts(25줄), engine-stop.ts(42줄),
                                         engine-watch-events.ts(121줄)
    - 소비자: engines, workers, orchestrators

  의존성 관리 (4파일이 utils/에만 존재):
    - src/utils/                       → replace-deps.ts(193줄), replace-deps-resolve.ts(223줄),
                                         collect-deps.ts(92줄), server-production-files.ts(186줄)
    - 소비자: BaseOrchestrator, workers

  빌드 코어 (2파일이 utils/에만 존재):
    - src/utils/                       → tsc-build.ts(226줄), tsconfig.ts(128줄)
    - 소비자: workers, orchestrators, engines

  패키지/설정 (5파일이 utils/에만 존재):
    - src/utils/                       → package-utils.ts(140줄), package-classify.ts(182줄),
                                         sd-config.ts(48줄), build-env.ts(13줄), orchestrator-utils.ts(22줄)
    - 소비자: orchestrators, commands

  파일 복사 (2파일이 utils/에만 존재):
    - src/utils/                       → copy-public.ts(130줄), copy-src.ts(62줄)
    - 소비자: workers, orchestrators

  SCSS (1파일이 utils/에 존재):
    - src/utils/                       → scss-compiler.ts(90줄)
    - 소비자: angular/client-transform-stylesheet 전용

  출력 (3파일이 utils/에만 존재):
    - src/utils/                       → output-utils.ts(67줄), output-path-rewriter.ts(101줄),
                                         diagnostic-utils.ts(28줄)
    - 소비자: orchestrators

  기타:
    - src/utils/                       → concurrency.ts(43줄), generate-pwa-icons.ts(56줄)

  ■ 핵심 문제:
  - angular/ 디렉토리에 2개 파일만 있고, 핵심 Angular 컴파일러 로직(560줄+401줄)은 utils/에 있음
  - esbuild, HMR, lint 등 명확한 도메인이 있는 파일들이 "utils"라는 이름 아래 묻혀 있음
  - runtime/ 디렉토리와 기능적으로 동일한 rebuild-manager, worker-utils 등이 utils/에 분리됨
  - scss-compiler는 angular/ 전용인데 utils/에 위치
suggestion: |
  src/ 전체를 도메인 기반으로 재구조화한다.
  도메인 디렉토리에 관련 파일을 응집시키고, utils/에는 진정한 범용 유틸리티만 남긴다.

  ■ 현재 구조 → 개선 구조:

  src/
  ├── angular/        2파일 → 7파일 (utils/에서 5파일 이동)
  │   ├── vite-angular-plugin.ts            (기존)
  │   ├── client-transform-stylesheet.ts    (기존)
  │   ├── angular-compiler.ts               ← utils/에서 이동
  │   ├── angular-build-pipeline.ts         ← utils/에서 이동
  │   ├── angular-build.ts                  ← utils/에서 이동
  │   ├── ngtsc-build-core.ts               ← utils/에서 이동
  │   └── scss-compiler.ts                  ← utils/에서 이동
  │
  ├── esbuild/        신설 (utils/에서 5파일 이동)
  │   ├── esbuild-config.ts                 ← utils/에서 이동
  │   ├── esbuild-client-config.ts          ← utils/에서 이동
  │   ├── esbuild-scss-plugin.ts            ← utils/에서 이동
  │   ├── esbuild-index-html.ts             ← utils/에서 이동
  │   └── esbuild-pwa.ts                    ← utils/에서 이동
  │
  ├── dev-server/     신설 (utils/에서 3파일 이동)
  │   ├── hmr-client-script.ts              ← utils/에서 이동
  │   ├── hmr-service.ts                    ← utils/에서 이동
  │   └── dev-http-server.ts                ← utils/에서 이동
  │
  ├── lint/           신설 (utils/에서 3파일 이동)
  │   ├── lint-core.ts                      ← utils/에서 이동
  │   ├── lint-with-program.ts              ← utils/에서 이동
  │   └── lint-utils.ts                     ← utils/에서 이동
  │
  ├── typecheck/      신설 (utils/에서 2파일 이동)
  │   ├── typecheck-serialization.ts        ← utils/에서 이동
  │   └── typecheck-non-package.ts          ← utils/에서 이동
  │
  ├── deps/           신설 (utils/에서 4파일 이동)
  │   ├── replace-deps.ts                   ← utils/에서 이동
  │   ├── replace-deps-resolve.ts           ← utils/에서 이동
  │   ├── collect-deps.ts                   ← utils/에서 이동
  │   └── server-production-files.ts        ← utils/에서 이동
  │
  ├── runtime/        2파일 → 7파일 (utils/에서 5파일 이동)
  │   ├── ResultCollector.ts                (기존)
  │   ├── SignalHandler.ts                  (기존)
  │   ├── rebuild-manager.ts                ← utils/에서 이동
  │   ├── worker-utils.ts                   ← utils/에서 이동
  │   ├── worker-events.ts                  ← utils/에서 이동
  │   ├── engine-stop.ts                    ← utils/에서 이동
  │   └── engine-watch-events.ts            ← utils/에서 이동
  │
  ├── capacitor/      (변경 없음, 4파일)
  ├── commands/       (변경 없음, 10파일)
  ├── electron/       (변경 없음, 1파일)
  ├── engines/        (변경 없음, 7파일)
  ├── orchestrators/  (변경 없음, 7파일)
  ├── workers/        (변경 없음, 6파일)
  │
  ├── utils/          41파일 → 14파일 (27파일 이동, 범용 유틸리티만 잔류)
  │   ├── build-env.ts
  │   ├── concurrency.ts
  │   ├── copy-public.ts
  │   ├── copy-src.ts
  │   ├── diagnostic-utils.ts
  │   ├── generate-pwa-icons.ts
  │   ├── orchestrator-utils.ts
  │   ├── output-path-rewriter.ts
  │   ├── output-utils.ts
  │   ├── package-classify.ts
  │   ├── package-utils.ts
  │   ├── sd-config.ts
  │   ├── tsc-build.ts
  │   └── tsconfig.ts
  │
  └── (루트 4파일: sd-cli.ts, sd-cli-entry.ts, sd-config.types.ts, index.ts)

  ■ 이동 요약: utils/에서 27파일 이동, 6개 도메인 디렉토리 신설/확장
  ■ import 경로 변경이 광범위하므로 일괄 rename 도구 사용을 권장한다.
  ■ 프로젝트의 "barrel export 금지" 규칙에 따라 하위 디렉토리에 re-export용 index.ts를 만들지 않는다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/sd-cli/src/engines/TscEngine.ts:56-64, NgtscEngine.ts:55-63, ServerEsbuildEngine.ts:60-68
title: BaseEngine 서브클래스 3곳에서 동일한 result normalization 코드 반복
description: |
  TscEngine._callBuild(), NgtscEngine._callBuild(), ServerEsbuildEngine._callBuild()에서
  Worker가 반환한 결과를 EngineResult로 변환하는 코드가 동일하게 반복된다:

    return {
      build: {
        success: result.build.success,
        errors: result.build.errors ?? [],
        warnings: result.build.warnings ?? [],
        diagnostics: result.build.diagnostics,
      },
      lint: result.lint,
    };

  현재 8줄 × 3곳 = 24줄의 기계적 중복이며, result 구조가 변경되면 3곳을 모두 수정해야 한다.
suggestion: |
  BaseEngine에 protected 메서드를 추가하여 중복을 제거한다:

    // BaseEngine.ts
    protected _normalizeResult(result: {
      build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: unknown[] };
      lint?: LintResult;
    }): EngineResult {
      return {
        build: {
          success: result.build.success,
          errors: result.build.errors ?? [],
          warnings: result.build.warnings ?? [],
          diagnostics: result.build.diagnostics,
        },
        lint: result.lint,
      };
    }

  서브클래스에서는 `return this._normalizeResult(result);`로 호출한다.
```

### DESIGN-002

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/sd-cli/src/orchestrators/BuildOrchestrator.ts:393-434
title: _addClientPackageTasks 내부에 Capacitor/Electron 네이티브 빌드 로직 인라인
description: |
  BuildOrchestrator._addClientPackageTasks() 메서드(366-438행, 72줄)의 후반부에
  Capacitor 네이티브 빌드(398-407행)와 Electron 네이티브 빌드(410-420행) 로직이
  클라이언트 빌드 태스크 생성 코드 안에 인라인되어 있다.

  현재 규모(각 ~10줄)에서는 심각하지 않지만, 네이티브 빌드 옵션이 확장될 경우
  이 메서드의 책임이 과도하게 커질 수 있다.
suggestion: |
  네이티브 빌드 로직을 별도 private 메서드로 추출한다:

    private async _runNativeBuilds(
      name: string,
      pkgDir: string,
      distPath: string,
      config: SdClientPackageConfig,
    ): Promise<boolean> { ... }

  _addClientPackageTasks에서는 `await this._runNativeBuilds(...)`로 호출한다.
  이를 통해 클라이언트 빌드 태스크 생성과 네이티브 빌드 실행의 책임이 분리된다.
```

---

## 거짓양성 필터링 결과

| 후보 이슈 | 판정 | 사유 |
|-----------|------|------|
| BuildOrchestrator God Class (502줄) | 거짓양성 | 메서드가 잘 분리되어 있고 책임이 응집적(프로덕션 빌드 조율). 502줄은 Orchestrator로서 합리적 규모 |
| check.ts 이중 lint 경로 | 거짓양성 | typecheck+lint 통합 경로와 lint-only 경로는 설계상 의도된 분기. typecheck 경로에서만 scripts 패키지를 처리하는 것은 TypecheckOrchestrator가 scripts 정보를 반환하기 때문 |
| EsbuildClientEngine의 BaseEngine 미상속 | 거짓양성 | Worker 이벤트 구조(serverReady 등)가 달라 별도 구현이 적절. CLAUDE.md에도 의도된 설계로 문서화됨 |
| Worker 파일 비대화 (400-500줄) | 거짓양성 | Worker는 격리된 실행 단위로, 내부 로직을 외부로 분리하면 오히려 Worker 경계를 훼손 |
| 순환 의존성 | 해당없음 | 순환 의존성 미발견. 의존 방향이 commands → orchestrators → engines → workers/utils로 건전 |

---

## 전체 아키텍처 평가

**건강도: 양호**

- 의존 방향이 일관적 (commands → orchestrators → engines → workers → utils, 역방향 없음)
- 순환 의존성 없음
- Template Method 패턴(BaseEngine)과 Factory 패턴(createBuildEngine)이 적절히 활용됨
- Worker 기반 격리로 빌드 안정성 확보
- 공개 API가 최소화됨 (sdAngularPlugin + SdConfig 타입만 export)
