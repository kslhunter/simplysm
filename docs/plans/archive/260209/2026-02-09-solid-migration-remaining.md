# Angular → Solid 마이그레이션 잔여 항목

> 작성일: 2026-02-09
> `.legacy-packages/sd-angular` → `packages/solid` 전환 잔여 목록

## 1단계: 컴포넌트

| #   | 항목              | 설명                                                 | 상태 |
| --- | ----------------- | ---------------------------------------------------- | ---- |
| 1   | **CheckBoxGroup** | 체크박스 묶음 → 값 배열 관리                         | [x]  |
| 2   | **RadioGroup**    | 라디오 묶음 → 단일 값 관리                           | [x]  |
| 3   | **Tab**           | 탭 헤더(버튼 바)만 제공. 콘텐츠 전환은 `<Show>` 사용 | [x]  |
| 4   | **StatePreset**   | 필터/정렬 등 상태 저장/불러오기                      | [x]  |
| 5   | **Numpad**        | 숫자 입력 패드                                       | [x]  |
| 6   | **Kanban**        | 칸반 보드 (Board + Lane)                             | [ ]  |
| 7   | **Barcode**       | 바코드 렌더링                                        | [x]  |
| 8   | **Calendar**      | 캘린더 (고도화 필요)                                 | [x]  |
| 9   | **Progress**      | 프로그레스 바                                        | [x]  |
| 10  | **ECharts 래퍼**  | option 반영 + ResizeObserver + cleanup. 얇은 래퍼    | [x]  |

## 2단계: 비-컴포넌트 기능

| #   | 항목                           | 구현 방식                                                    | 상태 |
| --- | ------------------------------ | ------------------------------------------------------------ | ---- |
| 11  | **printElement(el)**           | `window.print()` 기반 helper 함수                            | [x]  |
| 12  | **exportPdf(el, filename)**    | html-to-image → jsPDF helper 함수                            | [x]  |
| 13  | **usePersisted 저장방식 확장** | ConfigProvider에 storage 전략 주입, 없으면 localStorage 폴백 | [x]  |

## 3단계: Features (1~2단계 완료 후)

| #   | 항목                       | 구현 방식                                             | 상태 |
| --- | -------------------------- | ----------------------------------------------------- | ---- |
| 14  | **SharedDataProvider**     | 서버 데이터 캐싱/이벤트/필터링                        | [x]  |
| 15  | **AppStructureProvider**   | 메뉴 트리/권한/모듈 관리                              | [x]  |
| 16  | **PermissionTable**        | SharedDataProvider 기반                               | [x]  |
| 17  | **SharedData 관련 컨트롤** | SharedDataProvider 기반 (SelectButton, SelectList 등) | [x]  |

## 만들지 않는 것

| 항목                                                    | 이유                              |
| ------------------------------------------------------- | --------------------------------- |
| sd-anchor, sd-additional-button                         | 불필요                            |
| sd-modal-select-button                                  | Button + Modal 조합으로 충분      |
| sd-switch                                               | CheckBox로 대체                   |
| sd-range, sd-form, sd-gap                               | 불필요                            |
| sd-dock                                                 | flex + resizable로 대체           |
| sd-view                                                 | `<Show>`로 대체                   |
| sd-collapse-icon                                        | List 내 아이콘 rotate로 처리 완료 |
| FormatPipe                                              | 불필요                            |
| GlobalErrorHandler                                      | 불필요                            |
| 단축키 플러그인 (Ctrl+S 등)                             | 불필요                            |
| Angular 전용 (Signal 래퍼, Directive, TypedTemplate 등) | SolidJS 네이티브로 대체           |

## 이미 완료된 것

| Angular                                       | Solid                                                        | 비고                       |
| --------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| sd-button                                     | Button                                                       |                            |
| sd-checkbox                                   | CheckBox                                                     |                            |
| sd-radio                                      | Radio                                                        | (개별만, 그룹은 미구현)    |
| sd-collapse                                   | Collapse                                                     |                            |
| sd-collapse-icon                              | -                                                            | List 내 아이콘 rotate 처리 |
| sd-dropdown + sd-dropdown-popup               | Dropdown                                                     | 통합                       |
| sd-label                                      | Label                                                        |                            |
| sd-list + sd-list-item                        | List + ListItem                                              |                            |
| sd-modal                                      | Modal + ModalProvider                                        |                            |
| sd-note                                       | Note                                                         |                            |
| sd-pagination                                 | Pagination                                                   |                            |
| sd-select + sd-select-item + sd-select-button | Select + SelectItem + Select.Button                          |                            |
| sd-sheet + sd-sheet-config                    | Sheet + SheetColumn + SheetConfigModal                       |                            |
| sd-sidebar (4개)                              | Sidebar (4개)                                                |                            |
| sd-topbar (4개)                               | Topbar (4개)                                                 |                            |
| sd-textfield                                  | TextField                                                    |                            |
| sd-textarea                                   | TextAreaField                                                |                            |
| sd-date-range.picker                          | DateRangePicker                                              |                            |
| sd-quill-editor                               | RichTextEditor + EditorToolbar                               |                            |
| sd-busy-container                             | BusyContainer + BusyProvider                                 |                            |
| sd-toast                                      | NotificationBanner + NotificationBell + NotificationProvider |                            |
| sd-theme-selector                             | ThemeToggle                                                  |                            |
| SdThemeProvider                               | ThemeContext                                                 |                            |
| SdAngularConfigProvider                       | ConfigContext                                                |                            |
| SdLocalStorageProvider                        | usePersisted                                                 |                            |
| SdServiceClientFactoryProvider                | ServiceClientProvider                                        |                            |
| SdRippleDirective                             | directives/ripple.ts                                         |                            |
| SdRouterLinkDirective                         | useRouterLink                                                |                            |
| SdExpandingManager                            | Sheet 내부 구현                                              |                            |
| SdSelectionManager                            | Sheet/List 내부 구현                                         |                            |
| SdSortingManager                              | Sheet 내부 구현                                              |                            |

## Solid 고유 (Angular에 없는 신규)

| 컴포넌트/기능                                    | 설명                              |
| ------------------------------------------------ | --------------------------------- |
| Card                                             | 카드 컴포넌트                     |
| Icon                                             | 아이콘 컴포넌트                   |
| ColorPicker                                      | 색상 선택기                       |
| NumberField, DateField, DateTimeField, TimeField | 필드 타입별 분리                  |
| FormGroup, FormTable                             | 폼 레이아웃                       |
| Table                                            | 테이블 (Sheet와 별도)             |
| useClipboardValueCopy                            | 클립보드 복사 시 폼 값 포함       |
| createPropSignal                                 | Controlled/Uncontrolled 패턴 지원 |
| splitSlots                                       | Compound 컴포넌트용 children 분리 |
| tokens.styles / patterns.styles                  | 공유 스타일 토큰 시스템           |
