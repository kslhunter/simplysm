# WBS: sd-cli 대형 함수 서브함수 추출 리팩토링

## 프로젝트 개요

- **배경:** sd-cli 리팩토링 분석에서 2건의 Low severity 설계 이슈가 발견됨. 두 파일 모두 200줄 이상의 대형 함수가 여러 관심사를 인라인으로 포함하고 있어 유지보수 시 탐색 비용 발생
- **환경:** `packages/sd-cli/src/` — ~106개 TypeScript ESM 파일. 전체 아키텍처는 우수하며, 이슈는 함수 수준의 내부 리팩토링에 한정
- **전제조건:** 없음 (외부 API 변경 없는 내부 리팩토링)
- **기술적 제약:** esbuild 플러그인과 Worker 모듈의 클로저 기반 상태 공유 패턴을 유지해야 함
- **참조 자료:**
  - `.tasks/260415164927_refactor-sd-cli/refactor.md` — 리팩토링 분석 리포트 (이슈 상세 및 suggestion 확인)

## Impact Mapping

- **Goal:** sd-cli 대형 함수의 관심사별 탐색 시간 단축
  - **Actor:** sd-cli 유지보수 개발자
    - **Impact:** 특정 관심사(HMR, emit, 캐시 무효화 등) 변경 시 해당 함수만 찾아 수정한다
      - **Deliverable:** esbuild-angular-compiler-plugin.ts onStart 서브함수 추출
      - **Deliverable:** client.worker.ts startWatch 서브함수 추출

## Feature Breakdown

### Epic 1. 대형 함수 서브함수 추출

#### [x] Feature 1.1 esbuild-angular-compiler-plugin onStart 서브함수 추출

**의존성:** 없음

**범위:**

- `onStart` 콜백(303-508줄)에서 증분 빌드 처리 로직(316-383줄, ~67줄)을 `setup` 스코프 내의 이름 있는 함수로 추출
- `onStart` 콜백에서 첫 빌드 초기화 로직(384-409줄, ~25줄)을 `setup` 스코프 내의 이름 있는 함수로 추출
- `onStart` 콜백에서 processWebWorker 콜백 정의(412-456줄, ~44줄)를 `setup` 스코프 내의 이름 있는 함수로 추출
- 추출 후 `onStart` 콜백은 ~70줄의 오케스트레이션 코드로 축소

**경계:**

- `onStart` 외의 핸들러(onLoad, onEnd, onDispose)는 이 Feature에서 변경하지 않음
- 파일 상단의 유틸리티 함수(convertDiagnostic, createCompilerOptionsTransformer 등)는 변경하지 않음

**근거:**

- 리팩토링 리포트 DESIGN-001: `onStart` 콜백 ~205줄, 7개 관심사 포함

#### [x] Feature 1.2 client.worker.ts startWatch 서브함수 추출

**의존성:** 없음

**범위:**

- `startWatch` 함수(189-417줄)에서 인라인 `sd-build-start` esbuild 플러그인(251-308줄, ~57줄)을 모듈 스코프의 이름 있는 함수로 추출
- `startWatch` 함수에서 `onEnd` 콜백(310-369줄, ~59줄)을 모듈 스코프의 이름 있는 함수로 추출
- 추출 후 `startWatch` 함수는 ~110줄의 선형 설정 코드로 축소

**경계:**

- `build` 함수(93-184줄)는 이 Feature에서 변경하지 않음
- `stopWatch` 함수(422-456줄)는 이 Feature에서 변경하지 않음

**근거:**

- 리팩토링 리포트 DESIGN-002: `startWatch` ~228줄, 인라인 플러그인(~57줄)과 onEnd 콜백(~59줄) 포함

## 제외 사항

- 없음 (리포트의 모든 이슈를 Feature로 포함)
