# @simplysm/angular — 폼·기본 입력 컨트롤

버튼·앵커, 텍스트/숫자/날짜 입력, 체크박스/스위치, 셀렉트/드롭다운, 폼/접기/탭/리스트/페이지네이션 등 폼·UI 기본 컨트롤 군. 화면 폼·필터·시트 셀에서 함께 쓰임. 공통: 거의 모든 컨트롤이 `size: "sm"|"lg"`(미지정=기본), `inline`, `inset`(테두리 제거·셀 내장용), `disabled`, `theme` 을 가짐. 매뉴얼(client-component.md "표준 입력 컨트롤"·"버튼 스타일")의 역할별 theme/size 규약을 따름.

## 버튼·앵커

### SdButton (`sd-button`)

- `type: "button"|"submit"` — 버튼 타입. `"submit"` 이면 부모 `sd-form` submit 트리거. 기본 `"button"`.
- `theme` — 색 테마. 일반 시리즈 `"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`(채움 버튼), link 시리즈 `"link"|"link-primary"|...|"link-blue-gray"|"link-rev"`(테두리·배경 없는 텍스트 버튼). 저장/삭제 등 데이터 변경 최상위 액션은 일반 시리즈, 유틸/시트 위 버튼은 link 시리즈(client-component.md).
- `size: "sm"|"lg"` — 패딩 크기. 시트 위/셀 버튼은 `"sm"`.
- `inline: boolean` — true 면 width auto(인라인 배치). 기본은 width 100%.
- `inset: boolean` — true 면 테두리·radius 제거(컨테이너 내장 버튼).
- `disabled: boolean` — 비활성.
- `buttonStyle: string` / `buttonClass: string` — 내부 `<button>` 에 직접 줄 스타일/클래스.
- 사용: `<sd-button [theme]="'primary'" (click)="onSave()">저장</sd-button>`.

### SdAnchor (`sd-anchor`)

인라인 텍스트 링크/아이콘 버튼.

- `theme: "primary"|...|"blue-gray"` — 텍스트 색(기본 `"primary"`). hover 시 underline.
- `disabled: boolean` — true 면 흐려지고 포인터·tabindex 제거.
- 사용: 시트 셀 안 액션 아이콘 `<sd-anchor [theme]="'danger'" (click)="onDelete()"><ng-icon [svg]="tablerEraser" /></sd-anchor>`.

### SdAdditionalButton (`sd-additional-button`)

콘텐츠 + 우측 버튼을 한 테두리로 묶는 컨테이너. `<ng-content>` 본문 + 투영된 `sd-anchor`/`sd-button`.

- `size: "sm"|"lg"` — 패딩.
- `inset: boolean` — 테두리·radius 제거.

### SdModalSelectButton (`sd-modal-select-button`)

값 표시 + 검색 버튼으로 선택 모달을 띄우는 입력. 선택 결과(`SelectModalOutputResult`)를 `value` 에 반영.

- `modal: input.required<SdSelectModalInfo<SdSelectModal<K>>>` — 띄울 선택 모달 정보(`selectMode`/`selectedKeys` 는 자동 주입되므로 inputs 에서 제외).
- `value: model<...>` — 선택 값. `selectMode="single"` 이면 단일 키, `"multi"` 면 키 배열.
- `selectMode: "single"|"multi"` — 선택 모드(기본 `"single"`).
- `modalOptions: SdModalOptions` — 모달 표시 옵션.
- `required: boolean` — true 면 값 없을 때 invalid(빨간 점) + 지우개 버튼 숨김.
- `disabled` / `inset` / `size` — 공통.
- `searchIcon: input` — 검색 버튼 아이콘(기본 `tablerSearch`).
- 동작: 검색 버튼 클릭 → 현재 값으로 `selectedKeys` 채워 모달 표시 → 결과로 `value` 갱신. required 가 아니고 값 있으면 지우개로 비움.
- `SdSelectModal<TKey>` = `SdModalContentDef<SelectModalOutputResult<TKey>>` + `selectMode`/`selectedKeys` input. 선택 모달 컴포넌트가 구현(보통 `sd-crud-list` 를 모달로).
- `SdSelectModalInfo<T>` = `SdModalInfo<T, "selectMode"|"selectedKeys">`.

## 텍스트·숫자·날짜 입력

### SdTextfield<K> (`sd-textfield`)

타입별 핸들러로 파싱·포맷·검증하는 만능 입력. `value` 타입이 `type` 에 따라 결정됨.

- `type: input.required<K extends keyof SdTextfieldTypes>` — 입력 타입. 값 타입 매핑(`SdTextfieldTypes`):
  - `"text"|"password"|"email"|"color"|"format"` → `string`.
  - `"number"` → `number`(콤마 표시, 우정렬).
  - `"date"|"month"|"year"` → `DateOnly`.
  - `"datetime"|"datetime-sec"` → `DateTime`(sec 는 초 포함).
  - `"time"|"time-sec"` → `Time`.
  - (`sdTextfieldTypes` 는 이 키들의 런타임 배열.)
- `value: model<SdTextfieldTypes[K]>` — 값. 빈 입력은 `undefined`(결측 보존). 파싱 실패 시 표시값 롤백.
- `placeholder` / `title` — 안내/툴팁.
- `disabled` / `readonly` — readonly 는 값 표시만(input 미렌더).
- `required: boolean` — 빈 값이면 invalid.
- `min` / `max: SdTextfieldTypes[K]` — 숫자/날짜/시간 범위 검증.
- `minlength` / `maxlength: number` / `pattern: string` — 문자열 길이·정규식 검증(text 계열).
- `format: string` — `"format"` 타입의 마스킹 패턴(예: `"XXX-XXXX"`, `|` 로 여러 길이 후보).
- `validatorFn: (value) => string | undefined` — 커스텀 검증. 메시지 반환 시 invalid.
- `step: number` — 숫자/날짜 스텝.
- `autocomplete: string` — 자동완성 속성.
- `useNumberComma: boolean` — `"number"` 표시 시 천단위 콤마(기본 true). false 면 콤마 없이.
- `minDigits: number` — 숫자 표시 최소 소수 자릿수.
- `inline` / `inset` / `size` / `theme` / `inputStyle` / `inputClass` — 공통/스타일.
- 사용: `<sd-textfield [type]="'number'" [(value)]="data().qty" (valueChange)="mark(data)" />`.

### SdTextarea (`sd-textarea`)

여러 줄 텍스트. 내용 줄 수에 따라 자동 높이(`minRows` 이상).

- `value: model<string>` — 빈 값은 `undefined`.
- `minRows: number` — 최소 줄 수(기본 1).
- `placeholder` / `title` / `disabled` / `readonly` / `required` / `validatorFn` / `inline` / `inset` / `size` / `theme` / `inputStyle` / `inputClass` — `sd-textfield` 와 동일 의미.

### SdNumpad (`sd-numpad`)

터치 숫자 입력 패드 + 표시 필드.

- `value: model<number>` — 입력된 숫자.
- `placeholder: string` — 표시 필드 placeholder.
- `required: boolean` — true 면 빈 값에서 ENT 비활성.
- `inputDisabled: boolean` — true 면 상단 텍스트 직접 입력 막고 패드만.
- `useEnterButton: boolean` — true 면 ENT 버튼 표시.
- `useMinusButton: boolean` — true 면 부호(-) 버튼 표시.
- `enterButtonClick: output()` — ENT 클릭 시 발화(확정 처리 트리거).

### SdRange<K> (`sd-range`)

`from ~ to` 두 입력. `to` 의 min 을 `from` 으로 자동 제한.

- `type: input.required<K>` — `sd-textfield` 와 동일 타입 키.
- `from: model<SdTextfieldTypes[K]>` / `to: model<SdTextfieldTypes[K]>` — 범위 양끝.
- `required` / `disabled` / `inputStyle` — 공통.

### SdDateRangePicker (`sd-date-range-picker`)

기간 종류(일/월/범위) 선택 + 그에 맞는 날짜 입력. 종류·시작일 변경 시 `to` 자동 동기화(일=from과 동일, 월=그 달 1일~말일, 범위=from>to면 보정).

- `periodType: model<"일"|"월"|"범위">` — 기간 종류(기본 `"범위"`).
- `from: model<DateOnly>` / `to: model<DateOnly>` — 기간 양끝.
- `required: boolean` — 필수 여부.
- 사용: `<sd-date-range-picker [(from)]="filter().from" [(to)]="filter().to" (fromChange)="mark(filter)" />`.

## 체크박스·스위치

### SdCheckbox (`sd-checkbox`)

체크박스 또는 라디오. `canChangeFn` 으로 변경 가드.

- `value: model<boolean>` — 체크 상태.
- `canChangeFn: (next: boolean) => boolean | Promise<boolean>` — 변경 시도 시 false(또는 Promise<false>) 면 변경 차단. 비동기 확인 후 변경에 사용.
- `radio: boolean` — true 면 라디오 모양(클릭 시 항상 true, 토글 안 함).
- `icon: input` — 체크 아이콘(기본 `tablerCheck`).
- `disabled` / `size` / `inline` / `inset` / `theme`(+`"white"`) / `contentStyle` — 공통/스타일.
- 사용: 라디오 그룹은 같은 모델을 `[radio]="true"` 체크박스 여러 개로.

### SdSwitch (`sd-switch`)

on/off 토글 스위치.

- `value: model<boolean>` / `canChangeFn` — `sd-checkbox` 와 동일.
- `disabled` / `inline` / `inset` / `size` / `theme` — 공통.

### SdCheckboxGroup<T> / SdCheckboxGroupItem<T> (`sd-checkbox-group` / `-item`)

배열 값을 항목 체크로 토글하는 그룹.

- `SdCheckboxGroup.value: model<T[]>` — 선택된 항목 배열.
- `SdCheckboxGroup.disabled: boolean` — 그룹 전체 비활성.
- `SdCheckboxGroupItem.value: input.required<T>` — 이 항목의 값. 체크 시 그룹 배열에 추가/제거.
- `SdCheckboxGroupItem.inline: boolean` — 인라인 표시.
- 사용: `<sd-checkbox-group [(value)]="selected"><sd-checkbox-group-item [value]="'a'">A</sd-checkbox-group-item>...</sd-checkbox-group>`.

## 셀렉트·드롭다운

### SdSelect<M,T> (`sd-select`) + SdSelectItem<T> / SdSelectButton

드롭다운 셀렉트. 정적 항목(`sd-select-item` 투영) 또는 `items`+`itemOf` 템플릿, single/multi.

- `selectMode: "single"|"multi"` — 선택 모드(기본 single). multi 면 헤더에 전체선택/해제 + 체크박스.
- `value: model<SelectModeValue<any>[M]>` — single 이면 단일 값, multi 면 배열. `SelectModeValue<T> = { single: T; multi: T[] }`.
- `placeholder: string` — 미선택 표시.
- `required: boolean` — 빈 값이면 invalid.
- `items: T[]` + `getChildrenFn: (item) => T[]|undefined` — 데이터 기반 항목(트리 가능). `trackByFn: (item, index) => unknown`.
- `hideSelectAll: boolean` — multi 의 전체선택/해제 바 숨김.
- `multiSelectionDisplayDirection: "vertical"` — multi 선택 표시를 세로 나열.
- `disabled` / `inline` / `inset` / `size` / `contentClass` / `contentStyle` — 공통/스타일.
- `dropdownOpen: model<boolean>` — 드롭다운 열림 상태.
- 내부 메서드 `selectItem`/`toggleItem`/`openDropdown`/`closeDropdown` 은 자식 `sd-select-item` 이 호출.
- `SdSelectItem.value: input<T>` — 항목 값. `disabled` / `hidden` 으로 개별 제어. 클릭 시 부모 select 토글(single 은 닫힘).
- `SdSelectButton` (`sd-select-button`) — 드롭다운 우측에 끼우는 액션 버튼(검색/편집 등). `<sd-select-button>` 으로 투영.
- 사용: `<sd-select [(value)]="data().state" [required]="true"><sd-select-item [value]="'작성'">작성</sd-select-item></sd-select>`.

### SdDropdown / SdDropdownPopup (`sd-dropdown` / `sd-dropdown-popup`)

범용 드롭다운 토글 + 팝업. 위치 자동 배치, 모바일에선 하단 시트, 외부 클릭/blur/ESC 로 닫힘.

- `SdDropdown.open: model<boolean>` — 열림 상태.
- `SdDropdown.disabled: boolean` — true 면 토글 막음.
- 본문 콘텐츠와 `<sd-dropdown-popup>` 을 자식으로 둠. `sd-select`·`sd-topbar-menu`·`sd-theme-selector` 등이 내부에서 사용.

## 폼·접기·탭·리스트·페이지네이션

### SdForm (`sd-form`)

native form 래퍼. Enter/submit 버튼으로 submit, 검증 실패 시 네이티브 메시지·포커싱.

- `formSubmit: output<SubmitEvent>` — 검증 통과 후 submit. `(formSubmit)="onSubmit()"`.
- `formInvalid: output()` — 검증 실패 시.
- `requestSubmit(): void` — 코드에서 submit 트리거. `formEl` getter 로 native form 접근.
- `sd-crud-list`/`sd-crud-detail` 는 내부에 form 을 보유하므로 별도 래핑 불필요.

### SdCollapse / SdCollapseIcon (`sd-collapse` / `sd-collapse-icon`)

- `SdCollapse.open: boolean` — true 면 펼침, false 면 높이 0 으로 접힘(높이 트랜지션). 콘텐츠 높이 변화 자동 재측정.
- `SdCollapseIcon.open: boolean` — 열림이면 회전. `openRotate: number`(기본 90도) 만큼 회전. `icon`(기본 `tablerChevronDown`). 접기 토글 표시용.

### SdTab / SdTabItem (`sd-tab` / `sd-tab-item`)

- `SdTab.value: model<any>` — 선택된 탭 값.
- `SdTabItem.value: input<any>` — 이 탭의 값. 클릭 시 부모 `value` 로 set, 일치하면 선택 표시.
- 사용: `<sd-tab [(value)]="tab"><sd-tab-item [value]="'a'">A</sd-tab-item></sd-tab>`.

### SdList / SdListItem (`sd-list` / `sd-list-item`)

세로 리스트(중첩 가능, accordion/flat).

- `SdList.inset: boolean` — 배경 투명(중첩 리스트용).
- `SdListItem.layout: "accordion"|"flat"` — 자식 리스트 동작. `"accordion"`(기본) = 클릭 토글로 펼침, `"flat"` = 항상 펼침(섹션 헤더처럼).
- `SdListItem.open: model<boolean>` — accordion 펼침 상태.
- `SdListItem.selected: boolean` — 선택 강조.
- `SdListItem.selectedIcon: string` — leaf 항목에 선택 아이콘 표시.
- `SdListItem.readonly: boolean` — 클릭 토글 비활성.
- `SdListItem.contentStyle` / `contentClass` — 콘텐츠 행 스타일.
- `#toolTpl` 템플릿으로 행 우측 도구 배치. 사이드바/탑바 메뉴가 이 위에 구성됨.

### SdPagination (`sd-pagination`)

페이지 번호 네비게이터(처음/이전그룹/번호/다음그룹/끝).

- `currentPage: model<number>` — 0-based 현재 페이지.
- `totalPageCount: number` — 전체 페이지 수(0 이면 비표시).
- `visiblePageCount: number` — 한 번에 보일 번호 개수(기본 10).
- 사용: `<sd-pagination [(currentPage)]="page" [totalPageCount]="pageLength()" />`. `sd-sheet`/`sd-crud-list` 가 내장.
