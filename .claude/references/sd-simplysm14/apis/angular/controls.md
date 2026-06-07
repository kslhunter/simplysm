# @simplysm/angular — 폼·입력 컨트롤

버튼·앵커, 텍스트/숫자/날짜 입력, 체크박스/스위치, 셀렉트/드롭다운, 폼/접기/탭/리스트/페이지네이션 등 폼·UI 기본 컨트롤 군. 화면 폼·필터·시트 셀에서 함께 쓰임. 공통: 대부분 컨트롤이 `size: "sm"|"lg"`(미지정=기본), `inline`, `inset`(테두리 제거·셀 내장용), `disabled`, `theme` 을 가짐. 매뉴얼(client-component.md "표준 입력 컨트롤"·"버튼 스타일")의 역할별 theme/size 규약을 따름.

테마 계열(여러 컨트롤 공통): `"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`. 버튼은 추가로 link 계열(`"link"`·`"link-primary"`…`"link-rev"`)을 가짐.

## 버튼·앵커

### SdButton — `sd-button`
- `type: "button"|"submit"` — 폼 제출 버튼이면 `"submit"`.
- `theme` — 위 테마 계열 + link 계열. 데이터 변경 액션은 일반 계열, 유틸/시트 버튼은 link 계열.
- `size: "sm"|"lg"` — 크기. 시트 위 버튼은 `"sm"`.
- `inline`/`inset`/`disabled: boolean` — 인라인 배치/테두리 제거/비활성.
- `buttonStyle`/`buttonClass: string` — 내부 `<button>` 에 스타일/클래스 주입.

### SdAnchor — `sd-anchor`
- `disabled: boolean` — 비활성(클릭/포커스 차단).
- `theme` — 테마 계열(기본 `"primary"`). 텍스트 링크형 액션.

### SdAdditionalButton — `sd-additional-button`
입력 옆에 버튼을 붙이는 컨테이너.
- `size: "sm"|"lg"` — 크기.
- `inset: boolean` — 테두리 제거.

### SdModalSelectButton<K> — `sd-modal-select-button`
모달로 항목을 골라 값으로 받는 버튼(필수 검증 내장).
- `modal: input.required<SdSelectModalInfo<...>>` — 선택 모달. `selectMode`/현재 선택키 주입.
- `value: model<단일|배열>` — 선택 결과.
- `selectMode: "single"|"multi"` — 선택 모드(기본 single).
- `required`/`disabled`/`inset: boolean`, `size: "sm"|"lg"` — 상태/크기.
- `modalOptions: SdModalOptions` — 모달 옵션.
- `searchIcon` — 검색 버튼 아이콘.

## 텍스트·숫자·날짜 입력

### SdTextfield<K> — `sd-textfield`
타입별(`type` 으로 결정) 단일 입력. `SdTextfieldTypes` 키로 값 타입 결정.
- `type: input.required<K>` — `SdTextfieldTypes` 의 키. 값 타입을 결정.
- `value: model<SdTextfieldTypes[K]>` — 값(타입에 따라 string/number/`DateOnly`/`DateTime`/`Time`).
- `placeholder`/`title: string` — 안내/타이틀.
- `disabled`/`readonly`/`required: boolean` — 상태.
- `min`/`max: SdTextfieldTypes[K]`, `minlength`/`maxlength`/`pattern`/`step` — 검증 제약.
- `validatorFn: (value) => string | undefined` — 커스텀 검증(반환 문자열이 오류 메시지).
- `format: string` — `format` 타입의 마스킹 패턴.
- `useNumberComma: boolean` — 숫자 천단위 콤마(기본 true).
- `minDigits: number` — 숫자 표시 최소 자릿수.
- `inline`/`inset: boolean`, `size: "sm"|"lg"`, `theme` — 배치/크기/테마.
- `inputStyle`/`inputClass`/`autocomplete` — 내부 input 속성.

`SdTextfieldTypes` 키: `number`(number), `text`/`password`/`color`/`email`/`format`(string), `date`/`month`/`year`(`DateOnly`), `datetime`/`datetime-sec`(`DateTime`), `time`/`time-sec`(`Time`). 런타임 키 배열 `sdTextfieldTypes`.

```html
<sd-textfield [type]="'number'" [(value)]="data().qty" (valueChange)="mark(data)" [required]="true" />
```

### SdTextarea — `sd-textarea`
여러 줄 텍스트. `value: model<string>`, `minRows: number`(기본 1), 외에 textfield 와 유사한 `placeholder`/`disabled`/`readonly`/`required`/`validatorFn`/`size`/`theme`/`inline`/`inset`/`inputStyle`/`inputClass`.

### SdNumpad — `sd-numpad`
화면 숫자 키패드 입력.
- `value: model<number>` — 값.
- `placeholder: string`, `required`/`inputDisabled: boolean` — 안내/필수/직접입력 비활성.
- `useEnterButton`/`useMinusButton: boolean` — 엔터/마이너스 버튼 노출.
- `enterButtonClick: output` — 엔터 버튼 클릭.

### SdRange<K> — `sd-range`
같은 타입 두 값(from/to) 범위 입력.
- `type: input.required<K>` — `SdTextfieldTypes` 키.
- `from`/`to: model<SdTextfieldTypes[K]>` — 범위 양끝.
- `required`/`disabled: boolean`, `inputStyle: string`.

### SdDateRangePicker — `sd-date-range-picker`
기간 유형 + 날짜 범위 입력.
- `periodType: model<"일"|"월"|"범위">` — 기간 단위(기본 `"범위"`). `"일"`/`"월"` 은 단일 날짜를 from/to 로 환산.
- `from`/`to: model<DateOnly>` — 시작/끝 날짜.
- `required: boolean`.

## 체크박스·스위치

### SdCheckbox — `sd-checkbox`
- `value: model<boolean>` — 체크 여부.
- `radio: boolean` — 라디오 모양(그룹 내 단일 선택).
- `canChangeFn: (item) => boolean | Promise<boolean>` — 변경 허용 가드(`setupModelHook` 경유).
- `icon` — 체크 아이콘(기본 `tablerCheck`).
- `disabled`/`inline`/`inset: boolean`, `size: "sm"|"lg"` — 상태/크기.
- `theme` — 테마 계열 + `"white"`. `contentStyle: string`.

### SdSwitch — `sd-switch`
- `value: model<boolean>` — on/off.
- `canChangeFn` — 변경 가드.
- `disabled`/`inline`/`inset: boolean`, `size`, `theme` — 상태/크기/테마.

### SdCheckboxGroup<T> / SdCheckboxGroupItem<T>
여러 항목 다중 선택 그룹.
- `SdCheckboxGroup`: `value: model<T[]>`(선택된 값 배열), `disabled: boolean`.
- `SdCheckboxGroupItem`: `value: input.required<T>`(이 항목 값), `inline: boolean`.

## 셀렉트·드롭다운

### SdSelect<T, M> — `sd-select`
드롭다운 선택. 직속 `<sd-select-item>` 들 또는 `[items]`+`[itemOf]` 템플릿으로 옵션 구성.
- `selectMode: M`("single"|"multi", 기본 single) — 선택 모드.
- `value: model<단일|배열>` — 선택 값(들).
- `items: input<T[]>` + `trackByFn`/`getChildrenFn` — 데이터 기반 옵션(트리 지원).
- `placeholder: string`, `required`/`disabled`/`inline`/`inset: boolean`, `size`.
- `hideSelectAll: boolean` — multi 모드 전체선택 숨김.
- `multiSelectionDisplayDirection: "vertical"` — 다중 선택 표시를 세로로.
- `dropdownOpen: model<boolean>` — 드롭다운 열림 상태.
- `contentClass`/`contentStyle: string`.

`SelectModeValue<T>` — `{ multi: T[]; single: T }`(선택 모드별 값 타입).

### SdSelectItem<T> — `sd-select-item`
- `value: input<T>` — 항목 값.
- `disabled`/`hidden: boolean` — 비활성/숨김.

### SdSelectButton — `sd-select-button`
셀렉트 드롭다운 안에 끼우는 액션 버튼(리플 내장). 입력 없음.

### SdDropdown / SdDropdownPopup — `sd-dropdown` / `sd-dropdown-popup`
범용 드롭다운. `SdDropdown`: `open: model<boolean>`, `disabled: boolean`. 자식으로 트리거 컨텐츠 + `<sd-dropdown-popup>`(팝업 본문) 배치.

## 폼·레이아웃 컨트롤

### SdForm — `sd-form`
Enter 로 submit 처리. `formSubmit: output<SubmitEvent>`, `formInvalid: output`. (`sd-crud-*` 는 내부에 폼 보유, 별도 래핑 불필요.)

### SdCollapse / SdCollapseIcon
- `SdCollapse`(`sd-collapse`): `open: boolean` — 펼침. 자식을 높이 애니메이션으로 접기/펼치기.
- `SdCollapseIcon`(`sd-collapse-icon`): `icon`(기본 chevron), `open: boolean`, `openRotate: number`(열림 시 회전각, 기본 90).

### SdTab / SdTabItem
- `SdTab`(`sd-tab`): `value: model<any>` — 선택된 탭 값.
- `SdTabItem`(`sd-tab-item`): `value: input<any>` — 이 탭 값. 클릭 시 부모 `value` 갱신.

### SdList / SdListItem
- `SdList`(`sd-list`): `inset: boolean` — 테두리 제거(중첩 리스트).
- `SdListItem`(`sd-list-item`): `layout: "accordion"|"flat"`(기본 accordion, 자식 펼침 방식), `open: model<boolean>`, `selected: boolean`, `selectedIcon: string`, `readonly: boolean`, `contentStyle`/`contentClass: string`.

### SdGap — `sd-gap`
빈 간격. `height`/`width: "xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl"`(토큰 간격), `heightPx`/`widthPx`/`widthEm: number`(절대 간격).

### SdPagination — `sd-pagination`
- `currentPage: model<number>` — 현재 페이지(0 기반).
- `totalPageCount: number` — 총 페이지 수.
- `visiblePageCount: number` — 한 번에 보이는 페이지 번호 수(기본 10).
