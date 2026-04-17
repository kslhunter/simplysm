# WBS: sd-cli tests/ 폴더 포함/제외 로직 정비

## 프로젝트 개요

- **배경:** sd-cli의 typecheck/lint 수행 시 tests/ 포함 여부가 명령별로 올바르게 동작해야 한다. check 명령에서는 tests/ 포함, 그 외 명령(build, watch, dev)에서는 tests/ 제외해야 한다. 현재 로직이 여러 파일에 분산되어 있고 암묵적 메커니즘에 의존하여 반복적으로 문제가 발생한다.
- **환경:** pnpm 모노레포, TypeScript ESM, packages/ + tests/ 워크스페이스 구조
- **전제조건:** 없음
- **기술적 제약:** 기존 CLI 인터페이스(커맨드, 옵션) 변경 없이 내부 로직만 수정

## Impact Mapping

- **Goal:** tests/ 포함/제외 관련 반복 수정을 0으로 줄인다
  - **Actor:** 개발자 (sd-cli 사용자)
    - **Impact:** build/watch/dev 시 tests/ 파일이 포함되지 않아 빌드 안정성이 유지된다
      - **Deliverable:** tests/ 포함/제외 로직 중앙집중화 및 명시화
    - **Impact:** check 시 tests/ 파일이 빠짐없이 typecheck/lint 된다
      - **Deliverable:** check 경로의 tests/ 포함 로직 검증

## Feature Breakdown

### Epic 1. tests/ 포함/제외 로직 정비

#### [x] Feature 1.1 collectDeps에서 tests/ 패키지 제외

**의존성:** 없음

**범위:**

- `buildWorkspacePkgMap()`에서 `relDir.startsWith("tests/")` 필터링으로 tests/ 패키지 제외 (설계 결정 D1: API 변경 없는 필터링 방식 채택)

**경계:**

- `discoverWorkspacePackages()` 함수 자체를 수정하지 않음 (check 경로에서 사용)

**근거:**

- `collect-deps.ts:20`: `discoverWorkspacePackages(cwd)` 호출이 tests/ 패키지를 워크스페이스 맵에 포함시킨다
- `build-watch-paths.ts:26-27`: `deps.workspaceDeps`를 `packages/` 경로로 변환하므로, tests/ 패키지가 포함되면 잘못된 경로가 생성된다
- build/watch/dev의 파일 감시 경로에 tests/ 패키지가 부정확하게 매핑되는 구조적 문제

#### [x] Feature 1.2 non-check 경로에서 `includeTests: false` 명시화

**의존성:** 없음

**범위:**

- `BuildOrchestrator`의 모든 BuildOutput에 `includeTests: false` 명시 추가
  - `_addBuildPackageTasks` (`BuildOrchestrator.ts:319`): `{ js: true, dts: true, lint: false }` → `{ js: true, dts: true, lint: false, includeTests: false }`
  - `_addServerPackageTasks` (`BuildOrchestrator.ts:352`): 동일
  - `_addClientPackageTasks` (`BuildOrchestrator.ts:388`): 동일
- `WatchOrchestrator.start()` (`WatchOrchestrator.ts:130`): `{ js: true, dts: true, lint: false }` → `{ js: true, dts: true, lint: false, includeTests: false }`
- `DevOrchestrator._startDevMode()`의 서버/클라이언트 BuildOutput에 `includeTests: false` 명시 추가 (`DevOrchestrator.ts:133`, `DevOrchestrator.ts:140`)

**경계:**

- TypecheckOrchestrator의 `includeTests: true`는 수정하지 않음 (check 경로)
- BuildOutput 타입 자체는 변경하지 않음 (optional 유지 — 하위 호환)

**근거:**

- 현재 non-check 경로에서 `includeTests`를 설정하지 않아 `undefined`로 전달된다
- `undefined`는 falsy로 동작하여 기능상 정상이지만, 의도가 명시되지 않아 유지보수 시 실수 가능성이 높다
- `tsc-build.ts:79`: `needsEmit || !options.includeTests` — `includeTests`가 undefined일 때 `!undefined`는 true이므로 정상 동작하지만 암묵적이다
- 명시적 `false`로 "tests 제외가 의도된 것"임을 코드에서 즉시 확인 가능하게 한다

#### [x] Feature 1.3 테스트 검증 보강

**의존성:** Feature 1.1, Feature 1.2

**범위:**

- `collectDeps` 테스트: tests/ 패키지가 `workspaceDeps`에 포함되지 않는지 검증
- BuildOrchestrator 테스트: 엔진에 전달되는 BuildOutput에 `includeTests: false`가 포함되는지 검증
- WatchOrchestrator 테스트: 동일
- DevOrchestrator 테스트: 동일
- TypecheckOrchestrator 테스트: `includeTests: true`가 전달되는지 검증 (기존 동작 확인)
 내
**경계:**

- 실제 tsc/lint 실행 통합 테스트는 이 Feature에서 다루지 않음 (Worker 모킹으로 검증)

**근거:**

- 반복적으로 같은 문제가 발생하는 것은 테스트 부재가 원인
- 각 orchestrator가 엔진/워커에 전달하는 output의 `includeTests` 값을 테스트로 고정하면, 코드 변경 시 regression을 자동 감지 가능

## 제외 사항

- `discoverWorkspacePackages()` 함수 자체의 시그니처 변경 (Goal 미연결 — check 경로에서 정상 사용 중)
- `BuildOutput.includeTests` 타입을 required로 변경 (변경 리스크 대비 이점 불분명)
- build/watch/dev에 lint 기능 추가 (현재 요구사항 아님)
- `tsc-build.ts:79`의 조건식 리팩토링 (현재 정상 동작, 변경 리스크 불필요)
