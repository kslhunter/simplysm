# sd-cli 통합 리뷰

| 항목 | 값 |
|------|-----|
| 분석 대상 | sd-cli 4개 태스크 (unified-angular-compiler, scss-side-effect-import, check-lint-separation, workspace-scope-lint) |
| 분석 일시 | 2026-03-29 16:26 |
| 분석 파일 수 | 18개 (핵심 소스) |
| 발견 이슈 | 9건 (Critical: 0, Medium: 5, Low: 4) |

## Medium

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/utils/angular-compiler.ts:378
title: _findAffectedFiles에서 ts.Program 반환 케이스 미처리 — global change 시 진단/emit 누락
description: |
  getSemanticDiagnosticsOfNextAffectedFile()는 global scope 변경 시
  result.affected로 ts.Program을 반환할 수 있다.
  현재 코드는 이를 `as ts.SourceFile`로 캐스팅하여 Set에 추가한다.
  Program 객체는 이후 collectDiagnostics()의 `affectedFiles.has(sourceFile)` 검사에서
  어떤 SourceFile과도 매칭되지 않으므로, 모든 파일이 "미영향"으로 취급된다.
  결과: Angular 템플릿 진단이 캐시(stale)에서 읽히고, emitAffectedFiles의 2차 루프에서
  safeToSkipEmit이 아닌 파일만 emit되어 일부 파일이 누락될 수 있다.

  tsc-build.ts:153-158에서는 동일 케이스를 `affectedFiles = undefined`로
  처리하여 전체 리빌드로 전환한다. angular-compiler.ts에는 이 처리가 없다.
suggestion: |
  tsc-build.ts와 동일한 패턴 적용:
  `if ("fileName" in result.affected)` 로 분기하여
  ts.Program인 경우 affectedFiles에 builderProgram.getSourceFiles() 전체를 추가하거나,
  별도 플래그로 전체 리빌드를 트리거한다.
```

### LOGIC-002

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/sd-cli/src/utils/ngtsc-build-core.ts:387-390
title: runNgtscBuild의 js.success가 항상 true — 실제 빌드 상태와 무관
description: |
  runNgtscBuild()의 반환값에서 js.success가 항상 true로 하드코딩되어 있다.
  NgtscProgram은 JS와 DTS를 하나의 패스에서 함께 생성하므로,
  에러가 발생하면 dts.success에만 반영되고 js.success는 항상 true이다.

  소비자(BaseEngine, NgtscEngine._callBuild)에서는
  `success: result.js.success && result.dts.success`로 최종 성공을 판단하므로
  현재는 실질적 데이터 손실이 없다.
  그러나 js.success만 별도로 참조하는 코드가 추가되면 잘못된 판단의 원인이 된다.
suggestion: |
  js.success를 dts.success와 동일하게 설정하거나,
  NgtscBuildResult의 js/dts 분리 구조 자체를 단일 result로 통합하는 것을 검토한다.
  현재 구조를 유지하려면 최소한 주석으로 "단일 패스이므로 js.success는 항상 true"임을 명시한다.
```

### CONSIST-001

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/sd-cli/src/angular/vite-angular-plugin.ts:153-168, 201-216
title: lintRunner 초기화 로직이 buildStart와 handleHotUpdate에 중복
description: |
  buildStart와 handleHotUpdate 모두에서 lintRunner가 null일 때
  동일한 초기화 로직(pkgDir → package.json 읽기 → pkgName 추출 → new LintWithProgramRunner)을
  수행한다. 두 블록이 14줄씩 거의 동일한 코드이다.
suggestion: |
  lintRunner 초기화를 별도 함수로 추출한다.
  예: `function getOrCreateLintRunner(tsconfig, cwd): LintWithProgramRunner`
```

### CONSIST-002

```
id: CONSIST-002
severity: Medium
category: 일관성
location: packages/sd-cli/src/utils/ngtsc-build-core.ts:347, packages/sd-cli/src/angular/vite-angular-plugin.ts:299, packages/sd-cli/src/utils/tsc-build.ts:175
title: 워크스페이스 스코프 진단 필터링 — 3가지 다른 구현
description: |
  "cwd 하위 + node_modules 제외" 진단 필터링이 3곳에서 각각 다르게 구현되어 있다:
  1. ngtsc-build-core.ts / ngtsc-build.worker.ts / vite-angular-plugin.ts:
     `normalized.startsWith(normalizedCwd + "/") && !normalized.includes("/node_modules/")`
  2. tsc-build.ts:
     `pathx.isChildPath(fileName, cwd)` + 별도 `includes("node_modules")` 체크

  동일 의도의 로직이 분산되어 있어,
  향후 필터 조건 변경 시 누락 위험이 높다.
suggestion: |
  공통 유틸 함수를 만든다:
  `function isWorkspaceDiagnostic(fileName: string, cwd: string): boolean`
  모든 진단 필터링 지점에서 이 함수를 호출한다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/utils/lint-with-program.ts:139
title: ESLint 캐시 경로가 scoped 패키지명 포함 시 예상치 못한 디렉토리 생성
description: |
  캐시 경로: `path.join(this._cwd, ".cache", `eslint-${this._pkgName}.cache`)`
  vite-angular-plugin.ts에서 lintRunner를 생성할 때 pkgName은
  package.json의 name 필드(`@simplysm/angular` 등)에서 가져온다.
  `@simplysm/angular`은 `/`를 포함하므로 캐시 경로가
  `.cache/eslint-@simplysm/angular.cache`가 되어
  의도치 않은 `eslint-@simplysm/` 서브디렉토리가 생성된다.

  ngtsc-build.worker에서는 info.name이 sd.config.ts 키(`angular`)이므로
  문제없지만, vite-angular-plugin 경로에서만 발생한다.
suggestion: |
  pkgName의 `/`를 `-`로 치환하거나, `path.basename`으로 처리한다.
  또는 vite-angular-plugin에서 pkgName 추출 시 scoped prefix를 제거한다.
```

## Low

### CONSIST-003

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/sd-cli/src/angular/vite-angular-plugin.ts:321-331
title: 에러 메시지 포맷이 다른 빌드 경로와 상이
description: |
  vite-angular-plugin의 collectAndFormatDiagnostics는
  `(파일경로:줄번호) 메시지` 형식으로 포맷한다.
  ngtsc-build-core.ts와 tsc-build.ts는
  `파일경로:줄:열: TS코드: 메시지` 형식이다.
  동일 프로젝트의 타입체크 에러가 빌드 모드에 따라 다른 포맷으로 출력된다.
suggestion: |
  공통 에러 포맷 함수를 추출하거나, vite-angular-plugin에서
  ngtsc-build-core와 동일 포맷을 사용한다.
```

### CONSIST-004

```
id: CONSIST-004
severity: Low
category: 일관성
location: packages/sd-cli/src/commands/lint.ts:216, packages/sd-cli/src/utils/lint-utils.ts:10
title: 동일 이름 runLint 함수가 2개 모듈에 존재 — 반환 타입이 다름
description: |
  - lint.ts의 `runLint`: stdout 출력 + exitCode 설정, void 반환 (CLI 엔트리포인트)
  - lint-utils.ts의 `runLint`: Worker로 실행, LintResult 반환 (프로그래매틱 호출)

  같은 이름이지만 역할과 반환 타입이 다르다.
  check.ts에서 lint-utils.ts의 runLint을 import하는데,
  lint.ts의 runLint과 혼동될 수 있다.
suggestion: |
  lint-utils.ts의 함수를 `runLintWorker` 등으로 이름을 구분한다.
```

### PERF-001

```
id: PERF-001
severity: Low
category: 성능
location: packages/sd-cli/src/workers/ngtsc-build.worker.ts:151
title: Watch 모드에서 side-effect SCSS 전체를 매번 재컴파일
description: |
  performWatchBuild에서 compileSideEffectScss를 호출할 때
  레지스트리의 모든 SCSS 엔트리를 재컴파일한다.
  TypeScript 파일만 변경된 경우에도 SCSS가 전부 재컴파일된다.
  side-effect SCSS가 많은 프로젝트에서 watch 리빌드가 느려질 수 있다.
suggestion: |
  scssDependencies를 활용하여 변경된 SCSS에 의존하는 엔트리만
  선택적으로 재컴파일하거나, SCSS 변경 여부를 체크하여
  변경 없으면 compileSideEffectScss를 스킵한다.
```

### LOGIC-003

```
id: LOGIC-003
severity: Low
category: 로직
location: packages/sd-cli/src/angular/vite-angular-plugin.ts:170-179
title: Dev 모드 초기 빌드 결과(진단+린트)가 onBuild 콜백으로 전달되지 않음
description: |
  buildStart에서 `if (!options.dev)` 분기로 인해
  dev 모드에서는 초기 빌드의 진단과 린트 결과가 onBuild 콜백으로 보고되지 않는다.
  진단은 reportDiagnostics로 콘솔에 출력되지만,
  린트 결과(initialLintResult)는 완전히 유실된다.
  handleHotUpdate는 후속 파일 변경에만 호출되므로
  최초 빌드의 린트 이슈는 보고되지 않는다.
suggestion: |
  dev 모드에서도 초기 buildStart 완료 시 onBuild를 호출하거나,
  별도 onInitialBuild 콜백을 추가한다.
```
