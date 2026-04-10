# WBS: sd-cli ngtsc/angular 테스트 격리 개선

## 프로젝트 개요

- **배경:** `pnpm test sd-cli` 실행 시 `packages/angular/dist`가 삭제되는 문제 발생. 원인은 sd-cli 테스트가 실제 `packages/angular` 소스에 직접 의존하여 빌드 및 dist 삭제를 수행하기 때문.
- **환경:** pnpm 모노레포. vitest 기반 테스트. sd-cli 패키지 82개 테스트 중 6개 파일이 문제.
- **전제조건:** 기존 `tests/angular/fixtures/basic-app/` 독립 fixture 패턴이 이미 존재.
- **기술적 제약:** Angular AOT 컴파일 테스트는 실제 TypeScript/Angular 컴파일러 호출이 필요하므로, 완전 모킹보다 독립 fixture가 적합한 경우 있음.

## Impact Mapping

- **Goal:** sd-cli 테스트가 다른 패키지(angular)의 소스/산출물에 부수효과 없이 격리 실행
  - **Actor:** 개발자
    - **Impact:** 테스트 실행 후 다른 패키지의 빌드 산출물이 영향받지 않아 작업 흐름이 끊기지 않음
      - **Deliverable:** 6개 문제 테스트 파일의 `packages/angular` 직접 의존 제거

## Feature Breakdown

### Epic 1. sd-cli 테스트 격리 개선

#### [ ] Feature 1.1 workers/ ngtsc 테스트 격리

**의존성:** 없음

**범위:**

- `workers/ngtsc-build-worker.spec.ts`: 실제 `packages/angular` 소스 의존 제거, 독립 fixture 또는 tmpDir 기반으로 전환
- `workers/ngtsc-build-lint.spec.ts`: 통합 테스트 부분의 `packages/angular` 직접 참조 제거

**경계:**

- workers/ 내 다른 테스트(client-worker, library-build-*, server-build-*, server-runtime-worker)는 이미 적절히 격리되어 있으므로 대상 아님

**근거:**

- 디버그 분석: `ngtsc-build-worker.spec.ts:9-11`에서 `packages/angular` 직접 참조, `beforeAll/afterAll`에서 dist 삭제 확인
- 에이전트 분석: `ngtsc-build-lint.spec.ts:48-201`에 통합 테스트 혼재 보고

#### [ ] Feature 1.2 utils/ angular 의존 테스트 격리

**의존성:** Feature 1.1 (공통 fixture 공유 가능)

**범위:**

- `utils/angular-compiler.spec.ts`: 실제 angular 패키지로 ts.Program 생성 → fixture 또는 모킹 전환
- `utils/ngtsc-build-core.spec.ts`: 실제 Angular 컴파일러 호출 → fixture 또는 모킹 전환
- `utils/ngtsc-scss-config.spec.ts`: `angular/src/scss.d.ts`, `angular/package.json` 직접 읽기 → fixture 또는 인라인 데이터
- `utils/scss-compiler.spec.ts`: 실제 angular scss 파일 사용 → 독립 fixture scss 파일

**경계:**

- `angular/angular-build-pipeline.spec.ts`와 `.acc.spec.ts`는 이미 독립 fixture(`fixtures/basic-app/`) 사용 → 대상 아님
- utils/ 내 다른 테스트(~24개)는 이미 적절히 격리되어 있으므로 대상 아님

**근거:**

- 에이전트 분석: 4개 파일 모두 `angularPkgDir = resolve(workspaceRoot, "packages/angular")` 패턴으로 직접 참조 확인
- `ngtsc-scss-config.spec.ts:5`, `angular-compiler.spec.ts:99-100`, `scss-compiler.spec.ts:6-7`, `ngtsc-build-core.spec.ts:100`

## 제외 사항

- `angular/angular-build-pipeline.spec.ts`, `.acc.spec.ts`: 이미 독립 fixture 사용. 문제 없음.
- workers/, utils/ 내 기타 ~74개 테스트: 이미 적절히 격리됨.
- 테스트 프레임워크(vitest) 설정 변경: 현재 vitest.config.ts의 프로젝트 분리는 적절함. 변경 불필요.
