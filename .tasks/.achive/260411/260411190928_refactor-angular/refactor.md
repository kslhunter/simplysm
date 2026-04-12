# 리팩토링 분석 리포트: packages/angular

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/angular/src/` (146 소스 파일, 35 디렉토리) |
| 분석 일시 | 2026-04-11 |
| 발견 이슈 | 1건 (Critical 0 / Medium 1 / Low 0) |

## 계층 구조 이해

분석 과정에서 확인된 아키텍처 계층:

| 계층 | 디렉토리 | 설명 |
|------|----------|------|
| 인프라 | `core/`, `modal/`, `toast/`, `busy/`, `print/`, `navigation/` | 모든 feature가 의존하는 기반 서비스 |
| UI 기본요소 | `button/`, `checkbox/`, `select/`, `dropdown/`, `collapse/`, `gap/`, `form/`, `tab/`, `list/`, `input/` | 재사용 가능한 UI 원자 컴포넌트 |
| 레이아웃 | `dock/`, `sidebar/`, `topbar/`, `base-container/` | 페이지/화면 구조 컴포넌트 |
| 도메인 기능 | `sheet/`, `data-sheet/`, `data-detail/`, `data-select-button/`, `shared-data/`, `kanban/`, `permission-table/`, `state-preset/` | 비즈니스 CRUD 추상화 |
| 독립 기능 | `visual/`, `editor/`, `address/`, `pagination/`, `theme/` | 단일 목적 컴포넌트 |

## 이슈 목록

### STRUCT-001: core/ 종류별(type-based) → 기능별(feature-based) 재구조화 + 인프라 디렉토리 통합

```
id: STRUCT-001
severity: Medium
category: 구조
location: packages/angular/src/core/ 및 src/modal/, src/toast/, src/busy/, src/print/, src/navigation/
title: core/가 Angular 스타일 가이드에 반하는 종류별 구조 + 인프라 디렉토리가 feature와 혼재
description: |
  두 가지 구조적 문제:

  1. core/가 종류별(type-based) 디렉토리 구조 사용:
     providers/, utils/, directives/, plugins/, pipes/, types/
     Angular 공식 스��일 가이드(https://angular.dev/style-guide)는 명시적으로
     "Avoid creating subdirectories based on the type of code (components, directives, services)"
     라고 권고하며, "Organize your project by feature areas"를 추천한다.

  2. core/와 동일 인프라 계층인 modal/, toast/, busy/, print/, navigation/이
     button/, sheet/ 등 feature 디렉토리와 같은 top-level에 위치하여 계층 경계가 불명확.

  현재 종류별 구조의 문제:
    - 관련 파일이 분산됨: sd-invalid.ts(directives/)와 setupInvalid.ts(utils/setups/)가 별도 위치
    - routing 관련 파일이 3곳에 분산: sd-router-link(directives/), inject*PageCode(utils/),
      setupCanDeactivate(utils/setups/)
    - providers/ 11파일, utils/ 14파일에 서로 무관한 관심사가 혼재

suggestion: |
  core/를 기능별(feature-based)로 재구조화하고 인프라 디렉토리를 통합한다.
  import 의존성 분석으로 식별된 자연스러운 기능 클러스터:

  변경 전:
    src/
    ├── core/
    │   ├── providers/    ← 종류별 (11파일 혼재)
    │   ├── utils/        ← 종류별 (14파일 혼재)
    │   │   └── setups/   ← 종류별 (7파일 혼재)
    │   ├── directives/   ← 종류별 (7파일 혼재)
    │   ├── plugins/      ← 종류별
    │   ├── pipes/        ← 종류별 (1파일)
    │   ├── types/        ← 종류별 (1파일)
    │   └── commons.ts
    ├── modal/            ← 인프라 (top-level 혼재)
    ├── toast/            ← 인프라 (top-level 혼재)
    ├── busy/             ← 인프라 (top-level 혼재)
    ├── print/            ← 인프라 (top-level 혼재)
    ├── navigation/       ← 인프라 (top-level 혼재)
    ├── button/           ← feature
    └── sheet/            ← feature

  변경 후:
    src/
    ├── core/
    │   ├── modal/            ← 7파일 [src/modal/ 이동]
    │   ├── toast/            ← 3파일 [src/toast/ 이동]
    │   ├── busy/             ← 2파일 [src/busy/ 이동]
    │   ├── print/            ← 1파일 [src/print/ 이동]
    │   ├── routing/          ← 8파일 [directives/sd-router-link + providers/sd-navigate-window
    │   │                        + utils/inject*PageCode + utils/injectViewType/Title
    │   │                        + setups/setupCanDeactivate + src/navigation/menu-utils]
    │   ├── config/           ← 5파일 [providers/sd-angular-config + sd-local-storage
    │   │                        + sd-system-config + sd-system-log
    │   │                        + utils/injectSdSystemConfigResource]
    │   ├── app-structure/    ← 3파일 [providers/sd-app-structure.* 3파일]
    │   ├── selection/        ← 4파일 [utils/useSelectionManager + useSortingManager
    │   │                        + useExpandingManager + setups/setupCumulateSelectedKeys]
    │   ├── validation/       ← 2파일 [directives/sd-invalid + setups/setupInvalid]
    │   ├── ripple/           ← 2파일 [directives/sd-ripple + setups/setupRipple]
    │   ├── show-effect/      ← 2파일 [directives/sd-show-effect + setups/setupRevealOnShow]
    │   ├── events/           ← 4파일 [directives/sd-events + plugins/events/* 3파일]
    │   ├── commands/         ← 4파일 [plugins/commands/* 4파일]
    │   ├── error-handler/    ← 1파일 [plugins/sd-global-error-handler.plugin]
    │   ├── service-client/   ← 1파일 [providers/sd-service-client-factory]
    │   ├── shared-data/      ← 1파일 [providers/sd-shared-data]
    │   ├── file-dialog/      ← 1파일 [providers/sd-file-dialog]
    │   ├── template/         ← 2파일 [directives/sd-typed-template + sd-item-of-template]
    │   ├── ... (나머지 독립 유틸리티는 core/ 루트에 loose file로 배치)
    │   │   mark.ts, setSafeStyle.ts, withBusy.ts, setupModelHook.ts,
    │   │   setupBgTheme.ts, injectParent.ts, directive-input-signals.ts,
    │   │   select-modal-output-result.ts, format.pipe.ts
    │   ├── commons.ts
    │   └── provideSdAngular.ts
    ├── button/               ← feature만 남음
    └── sheet/

  영향 범위:
    - core/ 내부 48파일 + 인프라 14파일 = 총 62파일의 위치 변경
    - 이들을 import하는 feature 파일들의 상대 경로 수정
    - packages/angular/src/index.ts의 re-export 경로 수정
    - packages/angular/CLAUDE.md 구조 문서 업데이트

  근거:
    - Angular 공식 스타일 가이드: "Organize your project by feature areas"
    - Angular 공식 스타일 가이드: "Avoid creating subdirectories based on the type of code"
    - Angular 공식 스타일 가이드: "Group closely related files together in the same directory"
```

## 보고 제외 사항

| 후보 이슈 | 제외 사유 |
|------------|-----------|
| core/ → modal/ 역방향 의존 | 동일 인프라 계층 간 참조. 계층 위반 아님 |
| core/ → toast/ 역방향 의존 | 동일 인프라 계층 간 참조. 계층 위반 아님 |
| SdDataSheetBase 다중 책임 | 5개 composable로 위임된 Orchestrator 패턴. 의도된 설계 |
| sd-sheet.ts 파일 크기 (585줄) | 6개 composable 추출 완료. 잔여 코드는 템플릿+SCSS+시그널 와이어링 |
| shared-data/ 높은 fan-in | 고수준 합성 컴포넌트로서 불가피. 안정적 public API만 참조 |
| busyCount+withBusy+toast.try 반복 | 프로젝트 규칙("3줄 반복 < 조기 추상화")에 부합 |
| setupModelHook 시그널 패치 | Angular API 제한에 의한 프래그매틱 선택. 대안 부재 |
| injectParent _lView[8] 사용 | Angular 공식 API 부재. 방어 코드 포함된 현실적 해결책 |

## 전체 평가

`packages/angular`는 Angular 21의 최신 패턴(signals, standalone, @if/@for, zoneless)을 전면 적용하고,
composable 패턴(inject*/setup*/use*)으로 관심사를 잘 분리한 성숙한 코드베이스이다.
순환 의존성이 없고, 계층 간 의존 방향이 올바르다.
구조적 개선점은 core/를 Angular 스타일 가이드 권고에 맞게 기능별로 재구조화하고,
인프라 디렉토리를 core/ 하위로 통합하는 것이다.
