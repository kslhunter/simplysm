# @simplysm/angular — 폼 컨트롤·버튼·선택 컨트롤

폼 화면을 구성하는 입력/버튼/선택 컴포넌트 묶음. 대부분 `value = model()` 양방향 바인딩과 `theme`/`size`/`inline`/`inset`/`disabled` 공통 input 을 가짐. 공통 enum:
- theme(기본 8색): `"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"` — 색상 테마.
- size: `"sm"|"lg"` — 작게/크게(미지정=기본).
- inline: boolean — inline-block 으로 배치(폭 자동).
- inset: boolean — 테두리·라운드 제거(셀/그룹 내부 삽입용).
- disabled: boolean — 비활성.

## 버튼류

- **SdButton** `<sd-button>` — 버튼. `type`("button"|"submit", 기본 button), `theme`(8색 + `"link"`/`"link-<색>"`/`"link-rev"` 텍스트형), `inline`/`inset`/`size`/`disabled`, `buttonStyle`/`buttonClass`(내부 button 엘리먼트 스타일/클래스). 폼 제출 버튼이면 `type="submit"`.
- **SdAnchor** `<sd-anchor>` — 텍스트 링크. `theme`(8색, 기본 primary), `disabled`. 인라인 클릭 요소(아이콘 버튼 등)에.
- **SdAdditionalButton** `<sd-additional-button>` — 내용 + 우측 부속 버튼(`sd-anchor`/`sd-button` 투영) 컨테이너. `size`/`inset`.
- **SdModalSelectButton** `<sd-modal-select-button>` — 클릭 시 선택 모달을 띄워 값 선택. `modal = input.required<SdSelectModalInfo<...>>()`, `value = model()`, `selectMode`("single"|"multi", 기본 single — single 이면 단일 키, multi 면 키 배열), `required`(미선택 시 검증 오류 + 지우개 숨김), `disabled`/`inset`/`size`, `modalOptions`, `searchIcon`. required 아니고 값 있으면 지우개 표시. 타입: `SdSelectModal<TKey>`(선택모달이 구현, `SdModalContentDef<SelectModalOutputResult<TKey>>` + `selectMode`/`selectedKeys` input), `SdSelectModalInfo<T>`(selectMode/selectedKeys 제외한 모달 정보).

## 텍스트·숫자 입력

- **SdTextfield<K>** `<sd-textfield [type]="...">` — 타입별 단일 입력. `type = input.required<K>()`(K = `SdTextfieldTypes` 키), `value = model<SdTextfieldTypes[K]>()`. 추가 input: `placeholder`/`title`, `min`/`max`(타입에 맞는 값), `minlength`/`maxlength`/`pattern`(문자형 검증), `validatorFn`(커스텀 검증, 메시지 반환), `format`(format 타입의 X 마스크), `step`, `autocomplete`, `useNumberComma`(숫자 천단위 콤마, 기본 true), `minDigits`(숫자 소수 최소 자릿수), `required`, `readonly`, `inline`/`inset`/`size`/`theme`. 검증 실패 시 `setupInvalid` 로 폼 연동.
- **SdTextfieldTypes / sdTextfieldTypes** — 타입→값 매핑: `number`:number, `text`/`password`/`color`/`email`/`format`:string, `date`/`month`/`year`:DateOnly, `datetime`/`datetime-sec`:DateTime, `time`/`time-sec`:Time. `sdTextfieldTypes` 는 키 배열(예: select 옵션 생성).
- **SdTextarea** `<sd-textarea>` — 여러 줄 텍스트. `value = model<string>()`, `minRows`(기본 1, 내용 줄 수만큼 자동 확장), `placeholder`/`title`/`required`/`readonly`/`validatorFn`/`inline`/`inset`/`size`/`theme`/`inputStyle`/`inputClass`.
- **SdNumpad** `<sd-numpad>` — 화면 숫자 키패드. `value = model<number>()`, `placeholder`, `required`, `inputDisabled`(상단 입력칸 직접입력 막기), `useEnterButton`/`useMinusButton`(ENT/− 버튼 표시), `enterButtonClick = output()`.
- **SdRange<K>** `<sd-range [type]="...">` — 동일 타입 두 값의 범위(`from ~ to`). `type = input.required<K>()`, `from`/`to` = model<SdTextfieldTypes[K]>(), `required`/`disabled`/`inputStyle`. to 의 min 은 from 으로 자동 제한.
- **SdDateRangePicker** `<sd-date-range-picker>` — 일/월/범위 선택. `periodType = model<"일"|"월"|"범위">("범위")`(일=from=to 동기화, 월=해당 월 1일~말일 자동, 범위=from~to 자유), `from`/`to` = model<DateOnly>(), `required`.

## 체크·스위치

- **SdCheckbox** `<sd-checkbox>` — 체크박스/라디오. `value = model(false)`, `canChangeFn`(변경 가드, boolean|Promise), `icon`(체크 아이콘), `radio`(라디오 모양·해제 불가), `disabled`/`size`/`inline`/`inset`, `theme`(8색 + `"white"`), `contentStyle`.
- **SdSwitch** `<sd-switch>` — 토글 스위치. `value = model(false)`, `canChangeFn`, `disabled`/`inline`/`inset`/`size`/`theme`(8색).
- **SdCheckboxGroup<T>** / **SdCheckboxGroupItem<T>** — 그룹 다중선택. group: `value = model<T[]>([])`, `disabled`. item: `value = input.required<T>()`, `inline`. 항목 클릭 시 그룹 value 배열에 추가/제거.

## 선택(드롭다운)

- **SdSelect<M, T>** `<sd-select>` — 드롭다운 선택. `selectMode = input("single" as M)`("single"|"multi" — multi 면 value 가 배열·전체선택 바 표시), `value = model<...>()`, `placeholder`, `required`(미선택 시 검증오류), `disabled`/`inline`/`inset`/`size`, `hideSelectAll`(multi 전체선택 바 숨김), `multiSelectionDisplayDirection`("vertical" 이면 선택 항목 세로 표시), `items`/`trackByFn`/`getChildrenFn`(items 지정 시 `itemOf` 템플릿으로 렌더·트리 지원), `contentClass`/`contentStyle`, `dropdownOpen = model(false)`. 메서드: selectItem/toggleItem/openDropdown/closeDropdown/onSelectAll/onDeselectAll. 키보드 ↑↓ 로 항목 이동. 타입 `SelectModeValue<T> = { multi: T[]; single: T }`.
- **SdSelectItem<T>** `<sd-select-item [value]="...">` — 선택 항목. `value`, `disabled`, `hidden`(검색 필터 등으로 숨김). multi 모드면 좌측 체크박스 표시. Enter/Space 로 선택·토글.
- **SdSelectButton** `<sd-select-button>` — sd-select 우측에 붙는 부속 버튼(검색/편집 등 트리거). input 없음, 클릭 이벤트는 투영된 내용에서 처리.

## 드롭다운(저수준)

- **SdDropdown** `<sd-dropdown>` — 트리거 + `sd-dropdown-popup` 팝업. `open = model(false)`, `disabled`. 화면 위치 자동 배치, 모바일(≤520px)에선 하단 시트 + backdrop. 키보드 ↓ 로 열고 ↑/ESC 로 닫음. `popupElRef`(contentChild)로 팝업 엘리먼트 접근.
- **SdDropdownPopup** `<sd-dropdown-popup>` — 드롭다운 내용. input 없음. 내용 높이 300px 초과 시 자동 스크롤 캡.

## 폼·접기·탭·리스트·여백·페이지

- **SdForm** `<sd-form>` — `(formSubmit)`(검증 통과 시 SubmitEvent), `(formInvalid)`(검증 실패 시, 네이티브 메시지·포커스 자동). `requestSubmit()` 메서드, `formElRef`/`formEl`(폼 엘리먼트 접근). 내부 컨트롤들의 `setupInvalid` 검증을 모아 제출 제어.
- **SdCollapse** `<sd-collapse [open]="...">` — 높이 애니메이션 접기. `open`(boolean). 내용 높이 자동 측정.
- **SdCollapseIcon** `<sd-collapse-icon [open]="...">` — 펼침 상태 회전 아이콘. `icon`(기본 chevronDown), `open`, `openRotate`(펼칠 때 회전각도, 기본 90).
- **SdTab<any>** / **SdTabItem** — 탭. tab: `value = model<any>()`. item: `value = input<any>()`(클릭 시 부모 value 설정, 일치하면 선택 표시).
- **SdList** / **SdListItem** — 리스트(트리). list: `inset`. item: `layout`("accordion"|"flat", 기본 accordion — accordion 은 클릭 시 자식 접기/펼치기, flat 은 항상 펼침·헤더 비클릭), `open = model(false)`, `selected`(선택 강조), `selectedIcon`(선택 아이콘 표시), `readonly`(클릭 비활성), `contentStyle`/`contentClass`, `toolTpl`(우측 도구 템플릿). 자식 `sd-list` 투영 시 하위 트리.
- **SdGap** `<sd-gap>` — 여백 스페이서. `height`/`width`("xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl" CSS 변수 단위), `heightPx`/`widthPx`/`widthEm`(숫자, 0 이면 display:none). width 계열 지정 시 inline-block, height 계열이면 block.
- **SdPagination** `<sd-pagination>` — 페이지 네비게이션. `currentPage = model(0)`(0 기반), `totalPageCount`(전체 페이지 수), `visiblePageCount`(한 그룹 표시 수, 기본 10). 처음/이전그룹/페이지번호/다음그룹/끝 버튼.
