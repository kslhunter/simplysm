# WBS: createCompilerPlugin 옵션을 Angular CLI 표준에 맞게 정렬

## 프로젝트 개요

- **배경:** `@angular/build@21.2.7`에서 `supportJitMode = !!pluginOptions.includeTestMetadata`로 매핑하는데, sd-cli가 `includeTestMetadata`를 전달하지 않아 `supportJitMode: false`가 되어 `forbidOrphanComponents: true`와 충돌하는 빌드 에러 발생
- **환경:** simplysm 모노레포의 `@simplysm/sd-cli` 패키지 (`packages/sd-cli`)
- **전제조건:** Angular 21.2.x, `@angular/build/private`의 `createCompilerPlugin` API 사용 중
- **기술적 제약:** `CompilerPluginOptions` 공식 인터페이스에 정의된 속성만 사용해야 함
- **참조 자료:**
  - `.tasks/260412181207_debug-jit-forbid-orphan/debug.md` — 근본 원인 분석 결과
  - Angular CLI 소스 `createCompilerPluginOptions` — 공식 옵션 구성 기준

## Impact Mapping

- **Goal:** Angular 21.2 클라이언트 빌드에서 `forbidOrphanComponents` 활성화 시 빌드 에러 제거
  - **Actor:** sd-cli 사용자 (소비 프로젝트 개발자)
    - **Impact:** `forbidOrphanComponents: true` 설정으로 Angular 21 strict 모드를 완전히 활용한다
      - **Deliverable:** `createCompilerPlugin` 옵션을 Angular CLI 표준에 맞게 정렬

## Feature Breakdown

### Epic 1. createCompilerPlugin 옵션 정렬

#### [x] Feature 1.1 CompilerPluginOptions를 Angular CLI 표준에 맞게 수정

**의존성:** 없음

**범위:**

- `includeTestMetadata: isDev` 추가 (dev: `true`, build: `false`)
- `browserOnlyBuild: true` 제거 (공식 인터페이스에 없는 속성)
- `incremental: true` → `incremental: isDev`로 변경 (Angular CLI: `!!options.watch`)
- 타입 캐스팅 `CompilerPluginOptions & { browserOnlyBuild?: boolean }` → `CompilerPluginOptions`로 단순화
- 기존 테스트의 `browserOnlyBuild` assertion을 `includeTestMetadata` assertion으로 변경

**경계:**

- `BundleStylesheetOptions`의 `inlineStyleLanguage` 타입 캐스팅은 이 Feature에서 다루지 않음
- 프로덕션 빌드에서 `forbidOrphanComponents` + `includeTestMetadata: false` 조합은 Angular 자체 제약이므로 이 Feature에서 다루지 않음

**근거:**

- 디버그 분석: `.tasks/260412181207_debug-jit-forbid-orphan/debug.md`
- Angular CLI 소스 `createCompilerPluginOptions` 함수에서 옵션 구성 방식 확인

## 제외 사항

- `BundleStylesheetOptions`의 `inlineStyleLanguage` 타입 캐스팅 정리 — 현재 동작에 영향 없으므로 별도 리팩토링 대상 (Goal 미연결)
