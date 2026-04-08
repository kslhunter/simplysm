# WBS: @simplysm/angular API 네이밍 표준화

## 프로젝트 개요

- **배경:** angular 패키지의 API 네이밍이 업계 표준(Angular Material, CDK 등)과 괴리가 있음. 아직 소비앱이 없는 지금이 리팩토링 적기.
- **환경:** pnpm 모노레포, TypeScript ESM, Angular 21. angular 패키지는 모노레포 내 leaf 패키지로 내부 소비자 없음.
- **전제조건:** 네이밍 규칙이 합의 완료되어 `packages/angular/CLAUDE.md`의 `## Naming Conventions` 섹션에 기록됨.
- **기술적 제약:** 소비앱이 없으므로 breaking change 부담 없음. 모든 변경을 한 버전에 일괄 적용.
- **참조 자료:**
  - `packages/angular/CLAUDE.md` — 합의된 네이밍 규칙 (Naming Conventions 섹션)
  - `packages/angular/src/index.ts` — 현재 export 심볼 전체 목록
  - `.claude/references/sd-simplysm14/angular/usage.md` — 현재 usage 문서 (업데이트 대상)
  - `.claude/references/sd-simplysm14/angular/docs/*.md` — 카테고리별 상세 문서 (업데이트 대상)

## Impact Mapping

- **Goal:** 라이브러리 광범위 채택 전에 API를 Angular 생태계 표준에 맞게 정비하여, 개발자 학습 비용을 최소화한다.
  - **Actor:** @simplysm/angular 라이브러리 소비 개발자 (미래)
    - **Impact:** Angular 생태계(Material, CDK 등)와 일관된 네이밍을 접하여 별도 학습 없이 사용 가능
      - **Deliverable:** 클래스명, 타입명, selector, 함수명 네이밍 표준화
  - **Actor:** 라이브러리 유지보수자
    - **Impact:** 코드베이스가 Angular 표준과 일치하여 기여/유지보수가 용이해짐
      - **Deliverable:** 소스 코드 + 테스트 + 문서 일괄 업데이트

## Feature Breakdown

### Epic 1. API 네이밍 표준화

#### [x] Feature 1.1 컴포넌트 클래스 Control 접미사 제거

**의존성:** 없음

**범위:**

- 모든 컴포넌트 클래스에서 `Control` 접미사 제거 (예: `SdButtonControl` → `SdButton`)
- 파일명 변경: `sd-button.control.ts` → `sd-button.ts`
- 패키지 내부 import 경로 및 참조 업데이트
- `index.ts` export 업데이트
- 테스트 파일의 import 및 참조 업데이트

**대상 (66개, 코드 확인 완료):**
- ui/form: SdButtonControl, SdAnchorControl, SdAdditionalButtonControl, SdModalSelectButtonControl, SdTextfieldControl, SdTextareaControl, SdNumpadControl, SdRangeControl, SdCheckboxControl, SdSwitchControl, SdCheckboxGroupControl, SdCheckboxGroupItemControl, SdSelectControl, SdSelectItemControl, SdSelectButtonControl, SdFormControl, SdStatePresetControl, SdTiptapEditorControl
- ui/data: SdListControl, SdListItemControl, SdSheetControl
- ui/layout: SdDockContainerControl, SdDockControl, SdGapControl, SdViewControl, SdViewItemControl, SdKanbanBoardControl, SdKanbanControl, SdKanbanLaneControl
- ui/navigation: SdCollapseControl, SdCollapseIconControl, SdTabControl, SdTabItemControl, SdTabviewControl, SdTabviewItemControl, SdPaginationControl, SdSidebarContainerControl, SdSidebarControl, SdSidebarMenuControl, SdSidebarUserControl, SdTopbarContainerControl, SdTopbarControl, SdTopbarMenuControl, SdTopbarUserControl
- ui/overlay: SdDropdownControl, SdDropdownPopupControl, SdModalControl, SdPromptModalControl, SdConfirmModalControl, SdToastControl, SdToastContainerControl, SdBusyContainerControl
- ui/visual: SdLabelControl, SdNoteControl, SdProgressControl, SdCalendarControl, SdBarcodeControl, SdEchartsControl
- features: SdBaseContainerControl, SdPermissionTableControl, SdDataSheetControl, SdDataDetailControl, SdDataSelectButtonControl, SdSharedDataSelectControl, SdSharedDataSelectButtonControl, SdSharedDataSelectListControl

**경계:**

- selector(`sd-button` 등)는 변경하지 않음 (이미 표준 부합)
- Provider 클래스는 이 Feature에서 다루지 않음 (변경 없음)
- `SdDateRangePicker`, `SdAddressSearchModal`, `SdSheetConfigModal` 등 이미 Control 접미사가 없는 클래스는 대상 외
- 변수명(`_parentControl`, `dockControls`), 메서드명(`getControlStep`, `toControlValue`), 프로퍼티명(`noFirstControlFocusing`)은 클래스 네이밍과 무관하므로 변경하지 않음
- 클래스명을 참조하는 주석(`// SdModalControl 생성`, `//#region`)은 정확성 유지를 위해 함께 업데이트

**근거:**

- 합의된 규칙: `packages/angular/CLAUDE.md` Naming Conventions — 컴포넌트는 `Sd{Name}`, 파일명은 `sd-{name}.ts`
- Angular Material 패턴: `MatButton`, `MatSelect` 등 접미사 없음

#### [x] Feature 1.2 디렉티브 클래스 Directive 접미사 제거 + selector camelCase 변환

**의존성:** Feature 1.1 (컴포넌트 내부에서 디렉티브를 import하므로, 컴포넌트 rename이 먼저 완료되어야 혼동 없음)

**범위:**

- 모든 디렉티브 클래스에서 `Directive` 접미사 제거 (예: `SdRippleDirective` → `SdRipple`)
- 속성 selector를 camelCase로 변환 (예: `[sd-ripple]` → `[sdRipple]`)
- 파일명 변경: `sd-ripple.directive.ts` → `sd-ripple.ts`
- 패키지 내 모든 template에서 옛 selector 참조 업데이트
- `index.ts` export 업데이트
- 테스트 파일 업데이트

**대상 (11개):**
- core/directives: SdEventsDirective(이벤트 바인딩 기반 selector→변경 없음), SdRippleDirective(`[sd-ripple]`→`[sdRipple]`), SdShowEffectDirective(`[sd-show-effect]`→`[sdShowEffect]`), SdInvalidDirective(`[sd-invalid]`→`[sdInvalid]`), SdTypedTemplateDirective(`ng-template[typed]`→변경 없음), SdItemOfTemplateDirective(`ng-template[itemOf]`→변경 없음), SdRouterLinkDirective(`[sd-router-link]`→`[sdRouterLink]`)
- ui/layout: SdPaneDirective(`[sd-pane]`/`sd-pane`→`[sdPane]`/`sd-pane`), SdCardDirective(`[sd-card]`/`sd-card`→`[sdCard]`/`sd-card`)
- ui/data/sheet: SdSheetColumnDirective(요소 selector `sd-sheet-column`→변경 없음)
- features/data-view: SdDataSheetColumnDirective(요소 selector `sd-data-sheet-column`→변경 없음)

**경계:**

- `ng-template[typed]`, `ng-template[itemOf]`의 selector는 `sd-` prefix가 아니므로 변경하지 않음
- 요소 selector(`sd-sheet-column`, `sd-data-sheet-column`)는 변경하지 않음 (이미 표준 부합)
- `SdPaneDirective`, `SdCardDirective`는 이중 selector(`[sd-pane]`/`sd-pane`)를 가지는데, 속성 부분만 camelCase로 변환하고 요소 부분은 유지

**근거:**

- 합의된 규칙: `packages/angular/CLAUDE.md` — 디렉티브는 `Sd{Name}`, selector는 `[sdCamelCase]`
- Angular Material 패턴: `MatRipple`(`[matRipple]`), `MatInput`(`[matInput]`)

#### [x] Feature 1.3 추상 클래스 Abs prefix → Base 접미사

**의존성:** Feature 1.1 (추상 클래스가 컴포넌트를 참조할 수 있으므로)

**범위:**

- `Abs` prefix를 제거하고 `Base` 접미사로 변경
- 추상 클래스를 companion 컴포넌트 파일에서 별도 `*.base.ts` 파일로 분리 (co-located 상태였음)
- `ISdDataDetailDataInfo` 인터페이스를 base 파일로 이동 (추상 클래스의 계약 타입)
- 패키지 내부 import 및 참조 업데이트
- `index.ts` export 업데이트
- 테스트 파일 업데이트

**대상 (3개):**
- `AbsSdDataSheet` → `SdDataSheetBase` (현재: `sd-data-sheet.ts`에 co-located → 신규: `sd-data-sheet.base.ts`로 분리)
- `AbsSdDataDetail` → `SdDataDetailBase` (현재: `sd-data-detail.ts`에 co-located → 신규: `sd-data-detail.base.ts`로 분리)
- `AbsSdDataSelectButton` → `SdDataSelectButtonBase` (현재: `sd-data-select-button.ts`에 co-located → 신규: `sd-data-select-button.base.ts`로 분리)

**경계:**

- 추상 클래스 내부의 메서드/프로퍼티 시그니처는 변경하지 않음
- `sd-data-sheet.types.ts`는 이동하지 않음 (이미 별도 파일)

**근거:**

- 합의된 규칙: `packages/angular/CLAUDE.md` — 추상 클래스는 `Sd{Name}Base`, 파일명은 `sd-{name}.base.ts`

#### [x] Feature 1.4 인터페이스/타입 I/T prefix 제거

**의존성:** Feature 1.1 (충돌 해결을 위해 컴포넌트 최종 이름이 확정되어야 함)
**Feature 문서:** [1.4-interface-type-prefix-removal.md](./1.4-interface-type-prefix-removal.md)

**범위:**

- 모든 인터페이스에서 `I` prefix 제거
- 모든 타입에서 `T` prefix 제거
- 충돌 3건에 대해 역할 서술 + `Def` 접미사 적용
- `ISidebarUserMenu` → `SdSidebarUserMenu` (Sd prefix 추가 + I 제거, SdTopbarUserMenu와 일관성)
- 파일명 변경: `TDirectiveInputSignals.ts` → `directive-input-signals.ts` (kebab-case 패턴 준수)
- 패키지 내부 모든 참조 업데이트
- `index.ts` export 업데이트
- 테스트 파일 업데이트 (자체 I-prefix 타입 15개 포함)

**충돌 해결 (3건):**
- `ISdModal<O>` → `SdModalContentDef<O>` (모달 콘텐츠 컴포넌트 구현 계약)
- `ISdToast<O>` → `SdToastContentDef<O>` (토스트 콘텐츠 컴포넌트 구현 계약)
- `ISdStatePreset` → `SdStatePresetDef` (프리셋 항목 데이터 형태)

**대상 (코드 확인 완료, 총 76개):**
- I prefix exported (43개): ISdAppStructureGroupItem, ISdAppStructureLeafItem, ISdAppStructureSubPermission, ISdMenu, ISdFlatMenu, ISdPermission, ISdFlatPermission, ISdResizeEvent, ISdIntersectionEvent, ISdSheetColumnDef, ISdSheetHeaderDef, ISdSheetConfig, ISdSheetItemKeydownEventParam, ISdSheetCellKeydownEventParam, ISdPrint, ISdPrintInput, ISdToastInput, ISdModalInfo, ISdModalOptions, ISdSelectModal, ISdKanbanBoardDropInfo, ISdKanbanDragRef, ISdKanbanDropTarget, ISdDataSheetItemPropInfo, ISdDataSheetItemInfo, ISdDataSheetSearchResult, ISdDataDetailDataInfo, ISdTopbarUserMenu, ISdStatePreset(→Def), ISharedDataBase, ISharedDataInfo, ISelectModalOutputResult, ISortingDef, IExpandItemDef, IAddress, ISidebarUserMenu(→SdSidebarUserMenu), ISdModal(→SdModalContentDef), ISdToast(→SdToastContentDef), ITextfieldParseOpts, ITextfieldFormatOpts, ITextfieldDisplayOpts, ITextfieldValidateOpts, ITextfieldTypeHandler
- I prefix internal (3개): IDaumPostcodeData, IConfigItem, ISharedDataEntry
- T prefix exported (12개): TSdAppStructureItem, TSdBusyType, TSdToastSeverity, TSdToastTheme, TSdViewType, TSdTextfieldTypes, TSdSelectModalInfo, TSelectModeValue, TDirectiveInputSignals, TUndefToOptional, TWithOptional, TBarcodeType
- T prefix internal (3개): TSdModalExcludeKeys, TSdModalOptionalKeys, TSdPrintOptionalKeys
- 테스트 파일 (15개): ITestUser, ITestItem(×2), ITestItem3, ITreeItem, IEditTestItem, ITestModalItem, ITestSharedItem, ITestListItem, IMockDaumPostcodeOptions, IItem(×5)

**경계:**

- 내부 전용 타입(export되지 않는 타입)도 일관성을 위해 함께 변경
- `SdItemOfTemplateContext`, `SdSheetCellContext`, `SharedDataHandle` 등 이미 I/T prefix가 없는 타입은 대상 외
- 변수명(`_parentControl`), 메서드명, 프로퍼티명은 변경하지 않음

**근거:**

- 합의된 규칙: `packages/angular/CLAUDE.md` — I/T prefix 없음, 충돌 시 대상 서술 + Def 접미사
- 현대 TypeScript/Angular 스타일 가이드에서 I/T prefix 사용 금지 권장
- ISidebarUserMenu Sd prefix 추가: SdTopbarUserMenu와의 일관성 (설계 결정 D2)
- 파일명 변경: 코드베이스 kebab-case 패턴 준수 (설계 결정 D3)

#### [x] Feature 1.5 Composable 함수 use* → inject* 변환
**Feature 문서:** [1.5-composable-function-rename.md](./1.5-composable-function-rename.md)

**의존성:** 없음

**범위:**

- DI(`inject()`)를 사용하는 `use*` 함수 12개를 `inject*`로 rename
- DI 미사용 `use*` 함수 9개는 `use*` 유지 (설계 결정 D1)
- 파일명 변경: `useSdSystemConfigResource.ts` → `injectSdSystemConfigResource.ts`
- 패키지 내부 모든 호출부 업데이트
- `index.ts` export 업데이트
- 테스트 파일 업데이트
- `packages/angular/CLAUDE.md` 컨벤션 테이블에 `use*` 카테고리 추가 (설계 결정 D2)

**대상 (DI 사용 함수, inject* rename, 12개):**
- core/utils: useSdSystemConfigResource, useCurrentPageCodeSignal, useFullPageCodeSignal, useViewTitleSignal, useViewTypeSignal
- core/providers: usePermsSignal (sd-app-structure.provider.ts에 co-located, 파일명 변경 없음)
- features/data-view: useDataSheetRefreshManager, useDataSheetInlineEditManager, useDataSheetModalEditManager, useDataSheetExcelManager
- ui/data/sheet: useSheetDomAccessor, useSheetColumnResizing

**변경 안 함 (DI 미사용, use* 유지, 9개):**
- core/utils: useSelectionManager, useSortingManager, useExpandingManager
- features/data-view: useDataSheetFilterManager
- ui/data/sheet: useSheetLayoutEngine, useSheetDisplayPipeline, useSheetColumnFixing, useSheetCellStyling, useSheetCellAgent

**경계:**

- `setup*` 함수는 변경하지 않음
- `withBusy`, `injectParent`, `setSafeStyle`, `mark` 등 `use`/`setup` 패턴이 아닌 유틸 함수는 대상 외
- DI 미사용 `use*` 함수는 `use*` prefix 유지 (inject 미사용이므로 inject* 부적절, 기존 setup*과 성격 다르므로 setup* 부적절)

**근거:**

- 합의된 규칙: `packages/angular/CLAUDE.md` — DI 사용 함수는 `inject{Name}`
- Angular 커뮤니티 권장: `inject()` 기반 composable에는 `inject*` prefix
- 설계 결정 D1: 3-prefix 체계(inject/setup/use) — inject=DI의존, setup=부수효과설치, use=순수유틸리티
- 설계 결정 D2: CLAUDE.md에 use* 카테고리 명시 추가

#### [x] Feature 1.6 문서 업데이트
**Feature 문서:** [1.6-doc-update.md](./1.6-doc-update.md)

**의존성:** Feature 1.1 ~ 1.5 전체 완료 후

**범위:**

- `.claude/references/sd-simplysm14/angular/usage.md` 의 모든 심볼명을 새 네이밍으로 업데이트
- `.claude/references/sd-simplysm14/angular/docs/*.md` 의 모든 심볼명을 새 네이밍으로 업데이트
- `packages/angular/CLAUDE.md`의 Architecture, Key Patterns 등 기존 섹션에서 옛 네이밍이 남아있는 부분을 새 네이밍으로 통일

**경계:**

- 문서의 구조/섹션 재편은 하지 않음 (심볼명 치환만)

**근거:**

- 사용자 결정: usage 문서 업데이트 범위에 포함 (명확화 질문 1번에서 확인)

## 제외 사항

- **Provider 클래스 rename**: `Provider` 접미사 유지로 합의됨 (사유: `service-*` 패키지와 `Service` 접미사 혼동 방지)
- **요소 selector 변경**: `sd-button`, `sd-modal` 등 요소 selector는 이미 표준 부합 (사유: 변경 불필요)
- **Plugin 클래스 rename**: `SdResizeEventPlugin` 등 플러그인 네이밍 유지 (사유: 내부 인프라이며 사용자 노출 적음)
- **마이그레이션 가이드**: 현재 소비앱이 없으므로 불필요 (사유: 사용자 명시)
- **파이프 클래스 rename**: `FormatPipe`의 `Pipe` 접미사 유지 (사유: Provider와 동일한 이유로 유지)
