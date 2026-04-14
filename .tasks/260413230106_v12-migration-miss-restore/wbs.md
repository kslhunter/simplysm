# WBS: v12→v14 마이그레이션 누락 API 복원

## 프로젝트 개요

- **배경:** `@simplysm/angular` 패키지의 v12→v14 마이그레이션 과정에서, 일부 컴포넌트의 input/contentChild가 누락되어 v12에서 제공하던 기능이 v14에서 사라진 것을 API surface 비교를 통해 확인함
- **환경:** simplysm 모노레포의 `packages/angular` 패키지. Angular 21, signal-based, standalone 컴포넌트
- **전제조건:** v14 아키텍처(signal input, `booleanAttribute` transform, `#tplRef` 문자열 기반 contentChild 패턴)를 따라야 함
- **기술적 제약:** v14의 기존 패턴과 일관성 유지 필수. v12 코드를 그대로 복사하는 것이 아니라 v14 스타일로 재구현
- **참조 자료:**
  - `D:\workspaces-12\simplysm\packages\sd-angular\src\` — v12 원본 코드 (v12 구현 방식 확인용)
  - `D:\workspaces-14\simplysm\packages\angular\src\` — v14 현재 코드 (수정 대상)

## Impact Mapping

- **Goal:** v12에서 제공하던 API를 v14에서 100% 복원하여 소비앱의 마이그레이션 완전성 확보
  - **Actor:** `@simplysm/angular` 소비앱 개발자
    - **Impact:** v12에서 사용하던 헤더 스타일링, 툴팁, 커스텀 헤더 템플릿, 모달 헤더 스타일, 아이콘 커스터마이징 기능을 v14에서도 동일하게 사용할 수 있다
      - **Deliverable:** 5건의 누락된 input/contentChild 복원

## Feature Breakdown

### Epic 1. sd-sheet-column 헤더 기능 복원

#### [x] Feature 1.1 sd-sheet-column 헤더 기능 복원 (headerStyle, tooltip, headerTplRef)

**의존성:** 없음

**범위:**

- `headerStyle` input 복원: 컬럼별 헤더 셀에 인라인 스타일 적용 기능
  - `SdSheetColumn`에 `headerStyle = input<string>()` 추가
  - `SdSheetColumnDef` 타입에 `headerStyle` 필드 추가
  - `useSheetLayoutEngine`에서 `headerStyle` 전파 (columnDefs 매핑)
  - `useSheetCellStyling`의 `getHeaderCellStyle`에서 `colDef.headerStyle` 병합 (SdSheetHeaderDef에 별도 필드 추가 대신 colDef 접근 — v14 패턴 일관성)
  - `sd-sheet.ts` 템플릿: 기존 `[style]="getHeaderCellStyle(cell)"` 바인딩이 자동 반영
- `tooltip` input 복원: 컬럼 헤더에 네이티브 브라우저 툴팁 + dotted underline 시각적 표시
  - `SdSheetColumn`에 `tooltip = input<string>()` 추가
  - `SdSheetColumnDef` 타입에 `tooltip` 필드 추가
  - `useSheetLayoutEngine`에서 `tooltip` 전파 (columnDefs 매핑)
  - `sd-sheet.ts` 템플릿에서 `[attr.title]="cell.colDef?.tooltip ?? cell.text"` 및 `[class.help]="cell.colDef?.tooltip"` 바인딩 (colDef 접근 — v14 패턴 일관성)
- `headerTplRef` contentChild 복원: 커스텀 헤더 템플릿 렌더링 기능
  - `SdSheetColumn`에 `headerTplRef = contentChild<TemplateRef<void>>("headerTpl")` 추가
  - `_columnControlMap` 활용하여 `getColumnHeaderTpl(key)` 메서드 추가 (v14의 cellTplRef/summaryTplRef 접근 패턴과 동일)
  - `sd-sheet.ts` 템플릿에서 `@if (cell.colDef && getColumnHeaderTpl(cell.colDef.key))` 분기로 커스텀 템플릿 / 텍스트 렌더링
  - isLastRow 셀에만 적용 (colDef가 isLastRow에만 존재하므로 자연스러운 제한)

**경계:**

- `ordering` input은 v14 신규 기능으로 유지

**근거:**

- v12 `sd-sheet-column.directive.ts:16-17,28` — `headerStyle`, `tooltip`, `headerTplRef` 선언
- v12 `SdSheetLayoutEngine.ts:32,42,63` — `headerStyle` 전파 파이프라인
- v12 `sd-sheet.control.ts:166-186` — `tooltip`의 `[attr.title]`/`[class.help]` 바인딩, `headerTplRef`의 `@if` 분기 렌더링
- v14 `sd-sheet-column.ts` — 3개 모두 부재 확인
- v14 `sd-sheet.ts:105` — `{{ cell.text }}` 텍스트 전용 확인
- v14 `scss/commons/_styles.scss:358-359` — `.help` CSS 클래스가 여전히 존재하나 미사용

---

#### [x] Feature 1.2 sd-data-sheet headerStyle/tooltip/headerTplRef 전파

**의존성:** 1.1

**범위:**

- `sd-data-sheet.ts` 내부 `<sd-sheet-column>` 템플릿에 `[headerStyle]`, `[tooltip]` 바인딩 추가
  - 기존 전파 필드(key, fixed, header, width, disableSorting, disableResizing, hidden, collapse)와 동일한 방식
- `headerTplRef` 전파: 기존 `summaryTplRef` 전파 패턴(`@if + nested #headerTpl ng-template`)을 따라 추가

**경계:**

- `ordering` 전파는 이 Feature에서 다루지 않음 (v14 신규 기능, SdDataSheet이 자체 순서를 관리할 수 있음)
- SdDataSheetColumn 클래스 자체는 변경 없음 (SdSheetColumn 상속으로 이미 input 보유)

**근거:**

- 코드 리뷰 LOGIC-001: `.tasks/260414130558_review-v12-migration-miss-restore/review.md`
- v14 `sd-data-sheet.ts:244-253` — 내부 `<sd-sheet-column>`에 headerStyle/tooltip/headerTplRef 바인딩 누락 확인
- v14 `sd-data-sheet.ts:255-258` — summaryTplRef 전파 패턴 확인 (headerTplRef 동일 방식 적용 근거)
- SdDataSheetColumn이 SdSheetColumn을 상속하여 input은 수락하나 내부에서 전파하지 않아 기능이 무시됨

---

### Epic 2. 기타 컴포넌트 API 복원

#### [x] Feature 2.1 sd-modal headerStyle 복원

**의존성:** 없음

**범위:**

- `headerStyle` input 복원: 모달 헤더 영역에 인라인 스타일 적용 기능
  - `SdModal`에 `headerStyle = input<string | undefined>(undefined)` 추가 (v14 optional input 패턴)
  - `sd-modal.ts` 템플릿의 `._header` div에 `[style]="headerStyle()"` 바인딩
  - `SdModalOptions`에 `headerStyle?: string` 필드 추가 (v14 패턴: SdModalOptions가 SdModal input 미러링)

**경계:**

- `useCloseByBackdrop`/`useCloseByEscapeKey`/`movable` 기본값 변경, `title` required→optional, `dialogElRef` 제거는 의도적 변경으로 확인됨 — 이 Feature에서 다루지 않음

**근거:**

- v12 `sd-modal.control.ts:347` — `headerStyle = input<string>()` 선언
- v12 `sd-modal.control.ts:64` — `._header` div에 `[style]="headerStyle()"` 바인딩
- v14 `sd-modal.ts` — `headerStyle` 부재, `._header`에 `[style]` 바인딩 없음
- v14 `sd-modal.provider.ts:55-71` — `SdModalOptions`에 `headerStyle` 부재

**Feature 문서:** [2.1-sd-modal-header-style.md](./2.1-sd-modal-header-style.md)

---

#### [x] Feature 2.2 sd-collapse-icon icon input 복원

**의존성:** 없음

**범위:**

- `icon` input 복원: collapse 아이콘 커스터마이징 기능
  - `SdCollapseIcon`에 `icon = input(tablerChevronRight)` 추가 (v14의 기본 아이콘 방향인 right 유지)
  - 템플릿에서 하드코딩된 `icons.tablerChevronRight`를 `icon()` signal로 교체

**경계:**

- 아이콘 방향 변경(v12 `tablerChevronDown` → v14 `tablerChevronRight`)은 의도적 변경으로 확인됨 — 기본값은 v14의 `tablerChevronRight` 유지

**근거:**

- v12 `sd-collapse-icon.control.ts:34` — `icon = input(tablerChevronDown)` 선언, 템플릿에서 `<ng-icon [svg]="icon()" />`
- v14 `sd-collapse-icon.ts:42` — `icon` input 부재, 하드코딩 `icons.tablerChevronRight`

### Epic 3. sd-sheet-column 셀 템플릿 타입 안전성 복원

#### [x] Feature 3.1 sd-sheet-column cellTplRef 타입 추론 및 required 복원

**의존성:** 1.1

**범위:**

- `SdSheetColumnCellTemplate` 디렉티브 신규 생성 (v12의 `SdSheetColumnCellTemplateDirective` 복원)
  - selector: `ng-template[cell]`
  - `cell = input.required<T[]>()` — 아이템 배열을 받아 제네릭 `T` 추론
  - `static ngTemplateContextGuard()` — 템플릿 컨텍스트를 `SdSheetCellContext<T>`로 타입 가드
- `SdSheetCellContext`에 제네릭 `<T>` 적용
  - `$implicit: T` (현재 `unknown`)
  - `item: T` (현재 `unknown`)
  - `index`, `depth`, `edit`는 그대로 유지
- `SdSheetColumn`에 제네릭 `<T = unknown>` 복원 (기본값 unknown — SdDataSheetColumn extends SdSheetColumn 등 하위호환)
  - `cellTplRef`를 `contentChild.required(SdSheetColumnCellTemplate, { read: TemplateRef })` 로 변경 (optional → required)
- ~~`sd-sheet.ts`에서 `SdSheetColumnCellTemplate` import 추가 (standalone imports 배열)~~ → 불필요 (v14 SdCalendar/SdItemOfTemplate 패턴 확인: projected content의 디렉티브는 host component imports에 불필요. 소비 컴포넌트에서 import)
- 소비앱 사용 패턴 복원: `<ng-template [cell]="items()" let-item="item">` → `item`이 `T`로 타입 추론됨

**경계:**

- `summaryTplRef`는 기존 문자열 ref 패턴 유지 (타입 추론 불필요)
- `headerTplRef`는 Feature 1.1에서 문자열 ref로 이미 복원됨 (타입 추론 불필요)

**근거:**

- v12 `sd-sheet-column-cell-template.directive.ts:7-18` — `SdSheetColumnCellTemplateDirective<TItem>`, `ngTemplateContextGuard`, `SdSheetColumnCellTemplateContext<TItem>`
- v12 `sd-sheet-column.directive.ts:24-27` — `contentChild.required(SdSheetColumnCellTemplateDirective, {read: TemplateRef})`
- v14 `sd-sheet-column.ts:9-15,32` — `SdSheetCellContext`에 `unknown` 타입, `contentChild("cellTpl")` optional
- Angular 공식 패턴: `ngTemplateContextGuard`는 Angular 21에서도 지원되는 공식 타입 가드 메커니즘
- v14 `sd-item-of-template.ts` — 동일 패턴(SdItemOfTemplate) 확인, `sd-calendar.ts:22` — standalone imports에 미포함 확인

**Feature 문서:** [3.1-sd-sheet-column-cell-tpl-type-safety.md](./3.1-sd-sheet-column-cell-tpl-type-safety.md)

## 제외 사항

- `sd-modal` 기본값 변경 (useCloseByBackdrop, useCloseByEscapeKey, movable) — 의도적 UX 개선으로 확인
- `sd-dropdown` contentClass/contentStyle — v12에서도 dead input. sd-select가 직접 적용하는 구조로 확인
- `sd-sidebar-user` menuTitle — v12에서도 미사용 dead code로 확인
- 기타 14건의 의도적 변경 — 코드베이스 조사를 통해 모두 합리적 근거 확인 완료
