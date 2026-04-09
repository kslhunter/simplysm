# Code Review: @simplysm/angular 패키지 리팩토링

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260407111755_angular-refactor` (WBS 6개 Feature) |
| 일시 | 2026-04-07 |
| 변경 파일 수 | 75개 (angular 패키지 51개 + sd-cli 패키지 18개 + 기타 6개) |
| 신규 파일 수 | 12개 (composable 8개 + types 2개 + provider 2개) |
| 발견 이슈 | **0건** |

## 분석 범위

### Epic 1. 아키텍처 레이어 정리

| Feature | 내용 | 검토 결과 |
|---------|------|-----------|
| 1.1 | SdBusyProvider/SdToastProvider/SdActivatedModalProvider → core/providers/ 이동, ISelectModalOutputResult → core/types/ 추출 | 정상 |
| 1.2 | setupCloserWhenSingleSelectionChange → features/data-view/ 이동 | 정상 |

### Epic 2. 파일 구조 개선

| Feature | 내용 | 검토 결과 |
|---------|------|-----------|
| 2.1 | sd-app-structure.provider.ts 3분할 (types/utils/provider) | 정상 |
| 2.2 | ISdMenu 통합 (modules 제거, url 추가), public export 추가 | 정상 |

### Epic 3. 컴포넌트 설계 개선

| Feature | 내용 | 검토 결과 |
|---------|------|-----------|
| 3.1 | SdSheetControl → 3개 composable 추출 (useSheetColumnResizing/DisplayPipeline/CellStyling) | 정상 |
| 3.2 | AbsSdDataSheet → 5개 composable 추출 (Filter/Refresh/InlineEdit/ModalEdit/Excel Manager) | 정상 |

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

## 분석 상세

### 1. 레이어 이동 (Feature 1.1, 1.2)

**검증 항목:**

- **import 경로 갱신**: angular 패키지 내 소스 파일 35개, 테스트 파일 16개의 import 경로가 모두 새 위치로 갱신됨
- **index.ts export**: 모든 public API 심볼이 새 파일 경로에서 export됨. 소비 프로젝트의 `@simplysm/angular` import는 영향 없음
- **SdActivatedModalProvider**: `import type { ISdModal }` (core/ → ui/ type-only import)으로 런타임 의존 없음. `@Injectable()` (not `providedIn: 'root'`) 유지 — 모달 인스턴스별 생성 패턴 보존
- **ISelectModalOutputResult**: `core/types/` 추출로 `features/data-view/` → `ui/form/button/` 역방향 의존 해소
- **setupCloserWhenSingleSelectionChange**: 유일한 사용처(`AbsSdDataSheet`)와 같은 디렉토리(`features/data-view/`)로 이동. import 경로 갱신 확인

### 2. 파일 분할 (Feature 2.1, 2.2)

**검증 항목:**

- **sd-app-structure.types.ts (60줄)**: 8개 타입/인터페이스 export. `ISdAppStructureLeafItem`에 `url?: string` 추가 — `getMenus()` leaf 분기에서 `url: item.url`로 전파
- **sd-app-structure.utils.ts (350줄)**: 20개 static 메서드, 원본과 1:1 일치. `getMenus()` 반환 타입이 `ISdMenu[]` (non-generic)로 변경 — `modules` 프로퍼티 제거에 따른 정합성 확인 완료
- **ISdMenu 통합**: 기존 `menu-utils.ts`의 `ISdMenu`(non-generic, url 포함)와 `sd-app-structure.provider.ts`의 `ISdMenu<TModule>`(generic, modules 포함)을 단일 정의로 통합. `menu-utils.ts`는 `sd-app-structure.types`에서 re-export
- **public export 추가**: `getMenuRouterLinkOption`, `getIsMenuSelected`, `matchesSearchText`가 `index.ts`에서 export됨
- **테스트**: url 전파 테스트 3건 추가 (url 있는 leaf, url 없는 leaf, 그룹 메뉴)

### 3. SdSheetControl 분해 (Feature 3.1)

**추출된 composable (3개, 269줄 합계):**

| Composable | 줄 수 | 책임 |
|-----------|-------|------|
| `useSheetColumnResizing` | 92 | 리사이징 상태, mouse event, config 저장, destroy cleanup |
| `useSheetDisplayPipeline` | 64 | sort → page → expand pipeline, effectivePageCount |
| `useSheetCellStyling` | 113 | header/data 셀 스타일, fixed positioning, tree indent, edit-mode class |

**검증 항목:**

- **property 재할당**: `this._resizing.isResizing` → `this._isResizing` 등으로 재할당하여 템플릿 변경 0건
- **리소스 정리**: `useSheetColumnResizing`에서 `destroyRef.onDestroy()`로 document listener cleanup 보장
- **파이프라인 정확성**: `useSheetDisplayPipeline`의 computed chain — items → sortedItems → pagedItems → displayItems (expanding filter 포함). `effectivePageCount`는 `totalPageCount > 0`이면 그 값 사용, 아니면 `items.length / itemsPerPage` 계산
- **기존 composable 무변경**: useSheetCellAgent, useSheetColumnFixing, useSheetDomAccessor, useSheetLayoutEngine 4개 기존 helper 변경 없음

### 4. AbsSdDataSheet 분해 (Feature 3.2)

**추출된 composable (5개, 342줄 합계):**

| Composable | 줄 수 | 책임 |
|-----------|-------|------|
| `useDataSheetFilterManager` | 30 | filter/lastFilter signal, doFilterSubmit |
| `useDataSheetRefreshManager` | 90 | refresh, getDiffs, effect 기반 자동 갱신 |
| `useDataSheetInlineEditManager` | 89 | doAddItem, doSubmit, doToggleDeleteItem |
| `useDataSheetModalEditManager` | 76 | doEditItem, doToggleDeleteItems, doModalConfirm/Cancel |
| `useDataSheetExcelManager` | 57 | doDownloadExcel, doUploadExcel |

**검증 항목:**

- **의존성 주입 패턴**: 모든 composable이 config object를 통해 명시적 의존성을 받음. Angular DI(`inject()`)는 composable 내부에서만 사용
- **교차 composable 호출**: inline/modal/excel → `refreshMgr.refresh()`, inline → `refreshMgr.getDiffs()`. 구성 순서: filter → refresh → inline → modal → excel (의존 방향 올바름)
- **lazy getter 패턴**: `getNewItemFn: () => this.newItem?.bind(this)` — optional abstract 메서드를 `super()` 시점 class field 미설정 문제 우회
- **effect 기반 자동 갱신**: `page()`, `lastFilter()`, `sortingDefs()` signal 변경 시 `queueMicrotask`로 비동기 refresh. `onCleanup` cancellation으로 경쟁 조건 방지
- **snapshot 관리**: `itemsSnapshot`이 composable closure 변수로 캡슐화 — `getDiffs()`만이 접근 가능
- **delegating 메서드**: `AbsSdDataSheet`의 public 메서드(doFilterSubmit, doAddItem 등)가 composable에 1:1 위임. `doRefresh()`만 guard 로직 보유 후 `mark(lastFilter)` 호출
- **에러 처리**: 모든 composable이 `errorMessageFn` 콜백으로 공통 에러 메시지 포맷 사용

### 5. 테스트

- 기존 테스트 파일 16개의 import 경로 갱신 확인
- 신규 테스트 3건 추가 (ISdMenu url 전파)
- data-sheet 테스트에서 composable 분해에 따른 fixture/assertion 갱신 확인
