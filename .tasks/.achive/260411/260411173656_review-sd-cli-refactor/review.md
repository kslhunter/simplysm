# 코드 리뷰: sd-cli 리팩토링 구현 검증

## 요약

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260411165344_sd-cli-refactor/*.md` 구현 결과 (Feature 1.1, 1.2, 1.3) |
| 일시 | 2026-04-11 |
| 분석 파일 수 | ~40개 (이동 27파일 + import 참조 파일 + 엔진 4파일 + BuildOrchestrator) |
| 발견 이슈 | 0건 |

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

### Feature 1.1: src/ 도메인 기반 디렉토리 재구조화

**검증 항목 및 결과:**

- **파일 이동 (27파일 → 7개 도메인 디렉토리)**: 모두 정상 이동 완료
  - `angular/` (5파일 이동, 기존 2파일 합쳐 총 7파일)
  - `esbuild/` (5파일), `dev-server/` (3파일), `lint/` (3파일), `typecheck/` (2파일), `deps/` (4파일)
  - `runtime/` (5파일 이동, 기존 2파일 합쳐 총 7파일)
- **utils/ 잔류 파일**: 14파일 정확히 잔류 (build-env, concurrency, copy-public, copy-src, diagnostic-utils, generate-pwa-icons, orchestrator-utils, output-path-rewriter, output-utils, package-classify, package-utils, sd-config, tsc-build, tsconfig)
- **import 경로 갱신**: src/ 및 tests/ 내 모든 import가 새 경로로 갱신됨. 이전 경로(`utils/angular-compiler` 등)를 참조하는 소스 파일 0건
- **교차 도메인 참조**: 4건 모두 올바르게 갱신
  - `esbuild-scss-plugin` → `../angular/scss-compiler` ✓
  - `ngtsc-build-core` → `../typecheck/typecheck-serialization`, `../lint/lint-with-program` ✓
  - `server-production-files` → `../esbuild/esbuild-config` ✓
  - `tsc-build` (utils/ 잔류) → `../typecheck/typecheck-serialization` ✓
- **.js 확장자 보존**: 기존 패턴(확장자 유/무) 그대로 유지
- **CLAUDE.md 갱신**: 7개 도메인 디렉토리 + utils/ 잔류 14파일 정확히 반영

### Feature 1.2: BaseEngine result normalization 중복 제거

**검증 항목 및 결과:**

- **`_normalizeResult()` 메서드** (BaseEngine.ts:106-124): 사양 대로 구현
  - `protected` 접근 제어자 ✓
  - 입력: `errors?`/`warnings?` (optional) → 출력: `errors`/`warnings` (required, `?? []` 변환) ✓
  - `diagnostics`, `lint` 그대로 전달 ✓
  - 인라인 객체 리터럴 타입 사용 (설계 결정 D1) ✓
- **import**: `SerializedDiagnostic`, `LintWithProgramResult`, `EngineResult` 모두 올바르게 import ✓
- **서브클래스 교체**:
  - `TscEngine._callBuild()` → `return this._normalizeResult(result)` ✓
  - `NgtscEngine._callBuild()` → `return this._normalizeResult(result)` ✓
  - `ServerEsbuildEngine._callBuild()` → `return this._normalizeResult(result)` ✓
- **인라인 normalization 잔여 코드**: 0건 (3곳 모두 완전 교체)

### Feature 1.3: BuildOrchestrator 네이티브 빌드 메서드 추출

**검증 항목 및 결과:**

- **`_runNativeBuilds()` 메서드** (BuildOrchestrator.ts:408-453): 사양 대로 구현
  - `private async` 접근 제어자 ✓
  - 시그니처: `(name, pkgDir, distPath, config: SdClientPackageConfig, hasUntrackedError: { value: boolean }) => Promise<void>` ✓
- **동작 보존**:
  - Capacitor: `Capacitor.create(pkgDir, config.capacitor!, config.exclude)` → `initialize()` → `build(distPath)` ✓
  - Electron: `Electron.create(pkgDir, config.electron!, config.exclude)` → `initialize()` → `build(distPath)` ✓
  - 병렬 실행: `Promise.allSettled(nativeBuildPromises)` ✓
  - 에러 추적: `hasUntrackedError.value = true` + `this._logger.error(...)` ✓
- **호출부** (BuildOrchestrator.ts:394-396):
  - `if (result.success)` 가드 내에서 호출 ✓
  - `distPath = pathx.posixResolve(pkgDir, "dist")` 계산 후 전달 ✓
  - 인라인 코드가 단일 메서드 호출로 대체됨 ✓
