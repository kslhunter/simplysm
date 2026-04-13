# WBS: packages/angular inject 변수 네이밍 컨벤션 통일

## 프로젝트 개요

- **배경:** `packages/angular` 내부에서 `inject(Sd*Provider)` 호출 시 변수명이 `_sdToast`, `_toast`, `_toastProvider` 등 3가지 패턴으로 혼재. sd 접두어를 유지하고 Provider 접미어만 제거하여 통일한다. (D1: 전역 충돌 방지 + 라이브러리/소비앱 규칙 단일화)
- **환경:** simplysm 모노레포의 `packages/angular` 패키지
- **전제조건:** 없음
- **기술적 제약:** abstract class의 inject 필드는 protected 접근 제한자 사용 (D2)
- **참조 자료:** 없음

## 네이밍 규칙 정의

### 라이브러리 내부 및 소비앱 (공통)

Sd* 프로바이더의 "Sd" 접두어를 유지하고 "Provider" 접미어만 제거한다. (D1)
abstract class에서는 private 대신 protected를 사용한다. (D2)

| inject 대상 | 클래스 필드 | 로컬 변수 |
|-------------|-----------|----------|
| `SdToastProvider` | `_sdToast` | `sdToast` |
| `SdModalProvider` | `_sdModal` | `sdModal` |
| `SdBusyProvider` | `_sdBusy` | `sdBusy` |
| `SdAppStructureProvider` | `_sdAppStructure` | `sdAppStructure` |
| `SdSystemLogProvider` | `_sdSystemLog` | `sdSystemLog` |
| `SdServiceClientFactoryProvider` | `_sdServiceClientFactory` | `sdServiceClientFactory` |
| `SdAngularConfigProvider` | `_sdAngularConfig` | `sdAngularConfig` |
| `SdNavigateWindowProvider` | `_sdNavigateWindow` | `sdNavigateWindow` |
| `SdActivatedModalProvider` | `_sdActivatedModal` | `sdActivatedModal` |
| `SdSharedDataProvider` | `_sdSharedData` | `sdSharedData` |
| `SdFileDialogProvider` | `_sdFileDialog` | `sdFileDialog` |
| `SdThemeProvider` | `_sdTheme` | `sdTheme` |
| `SdLocalStorageProvider` | `_sdLocalStorage` | `sdLocalStorage` |

## Impact Mapping

- **Goal:** `packages/angular` 내 inject 변수명 일관성 100% 달성
  - **Actor:** simplysm 라이브러리 개발자 / 소비앱 개발자
    - **Impact:** inject 변수명 패턴 통일로 코드 일관성 향상, 라이브러리/소비앱 동일 규칙으로 인지 부하 감소
      - **Deliverable 1:** `packages/angular/src` 소스 코드 변수명 통일
      - **Deliverable 2:** 사용자용 문서에 네이밍 컨벤션 규칙 추가

## Feature Breakdown

### Epic 1. inject 네이밍 컨벤션 통일

#### [x] Feature 1.1 소스 코드 변수명 리팩토링

**의존성:** 없음

**범위:**

변경 대상 (현재 규칙 불일치 항목):

**클래스 필드 (sd prefix 추가):**
- `_systemLog` -> `_sdSystemLog` (`layout/base-container/sd-base-container.ts:85`, `core/error-handler/sd-global-error-handler.plugin.ts:14`, `core/toast/sd-toast.provider.ts:39`)
- `_clientFactory` -> `_sdServiceClientFactory` (`core/app-structure/sd-app-structure.provider.ts:18`, `core/shared-data/sd-shared-data.provider.ts:43`)
- `_config` -> `_sdAngularConfig` (`core/app-structure/sd-app-structure.provider.ts:19`)
- `_navWindow` -> `_sdNavigateWindow` (`core/routing/sd-router-link.ts:15`)
- `_activatedModal` -> `_sdActivatedModal` (`core/modal/sd-modal.ts:288`)
- `_systemConfig` -> `_sdSystemConfig` (`core/modal/sd-modal.ts:289`)

**클래스 필드 (Provider suffix 제거 + sd prefix 추가):**
- `_toastProvider` -> `_sdToast` (`core/service-client/sd-service-client-factory.provider.ts:9`)
- `_configProvider` -> `_sdAngularConfig` (`core/service-client/sd-service-client-factory.provider.ts:10`)
- `_modalProvider` -> `_sdModal` (`data/sheet/sd-sheet.ts:371`)

**클래스 필드 (비표준 약어 정정):**
- `_sdNgConf` -> `_sdAngularConfig` (`core/config/sd-local-storage.provider.ts:6`)

**로컬 변수 (sd prefix 추가):**
- `activatedModal` -> `sdActivatedModal` (`core/routing/injectViewTypeSignal.ts:8`, `core/routing/injectViewTitleSignal.ts:8`, `core/routing/setupCanDeactivate.ts:6`)

**abstract class inject → protected:**
- `SdDataDetailBase._sdToast`: private → protected (`data/data-detail/sd-data-detail.base.ts:50`)
- `SdDataDetailBase._sdSharedData`: private → protected (`data/data-detail/sd-data-detail.base.ts:51`)
- `SdDataDetailBase._errorHandler`: private → protected (`data/data-detail/sd-data-detail.base.ts:52`)
- `SdDataSelectButtonBase._sdModal`: private → protected (`data/data-select-button/sd-data-select-button.base.ts:35`)
- `SdSharedDataProvider._sdServiceClientFactory` (rename + protected): (`core/shared-data/sd-shared-data.provider.ts:43`)
- `SdSharedDataProvider._errorHandler`: private → protected (`core/shared-data/sd-shared-data.provider.ts:44`)

**이미 규칙 일치 (변경 불필요):**
- `_sdActivatedModal`, `_sdAppStructure`, `_sdModal`, `_sdToast`, `_sdSharedData`, `_sdBusy`, `_sdNgConf`(약어 정정 제외)
- `sdTheme`, `sdLocalStorage`, `sdAppStructure`, `sdBusy`, `sdToast`, `sdFileDialog`, `sdSharedData`

**경계:**

- 소비앱 코드는 이 Feature에서 다루지 않음
- Angular 내장 서비스(ElementRef, DestroyRef 등)의 변수**명**은 변경하지 않음 (접근 제한자만 변경 대상)

**근거:**

- D1: sd prefix 유지 — 사용자 결정 (전역 충돌 방지 + 규칙 단일화)
- D2: abstract class의 모든 inject() → protected — 사용자 결정 (일관성 + 확장성)

**Feature 문서:** [1.1-source-code-variable-rename.md](./1.1-source-code-variable-rename.md)

#### [x] Feature 1.2 사용자 문서 네이밍 컨벤션 규칙 추가

**의존성:** 없음

**범위:**

- `.claude/references/sd-simplysm14/angular/usage.md`에 inject 네이밍 컨벤션 섹션 추가
  - 소비앱에서의 규칙: `_sdToast = inject(SdToastProvider)` (Sd 접두어 유지)
  - ~~라이브러리 내부 규칙과의 차이점 명시~~ → D1에 의해 라이브러리/소비앱 동일 규칙. 차이점 대신 통일 규칙만 안내
- 기존 코드 예제가 소비앱 컨벤션(`sdToast`, `sdModal`)을 따르고 있는지 확인 및 보정
  - **확인 결과:** 기존 예제 4곳 모두 소비앱 컨벤션 일치 → 보정 불필요

**경계:**

- 라이브러리 내부 개발자용 규칙은 이 문서에 포함하지 않음 (소비앱 개발자용 문서이므로)
- docs/ 하위 문서에는 inject 변수 예제가 없으므로 수정 대상 아님

**근거:**

- 사용자 요청: "사용자용 문서(예: .claude/references/sd-simplysm14/angular)에는 규칙을 추가해줘야한다"

**Feature 문서:** [1.2-user-doc-naming-convention.md](./1.2-user-doc-naming-convention.md)

## 제외 사항

- 소비앱 코드 수정 — 이 프로젝트(`packages/angular`)의 범위가 아님
- Angular 내장 서비스 변수명 변경 — 사용자 요청 범위 아님 (접근 제한자 변경은 D2에 따라 포함)
