# @simplysm/angular — 폼 컨트롤·버튼·선택 컨트롤

폼·입력·선택·버튼·드롭다운·리스트류 standalone 컴포넌트. 공통 패턴: 값은 `model()` 양방향, `disabled`/`inset`/`size`(`"sm"|"lg"`)/`inline`/`required` 다수 공유. 공통 theme literal = `"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`. `required` 컨트롤은 내부 `setupInvalid` 로 네이티브 폼 검증과 연동되어 `<sd-form>` 안에서 동작.

## SdButton / SdAnchor / SdAdditionalButton

- `<sd-button>` — 버튼. `type: "button"|"submit"`(폼 제출 트리거 여부), `theme`(공통 8색 + `"link"`/`"link-{색}"`/`"link-rev"` 텍스트버튼), `inline`(인라인폭), `inset`(테두리 없는 삽입형), `size`, `disabled`, `buttonStyle`/`buttonClass`(내부 `<button>` 에 적용). 클릭 ripple 내장.
- `<sd-anchor>` — 텍스트 링크형 클릭 요소. `disabled`, `theme`(공통 8색, 기본 `"primary"`). disabled 면 tabindex 제거.
- `<sd-additional-button>` — 콘텐츠 + 우측 버튼(`sd-anchor`/`sd-button` 투영) 결합 박스. `size`, `inset`.

## SdModalSelectButton

`<sd-modal-select-button>` — 모달로 선택하는 값 입력 버튼(검색 아이콘 → 선택모달, 지우개 → 초기화).

- `modal = input.required<SdSelectModalInfo<SdSelectModal<K>>>()` — 띄울 선택 모달 정보(`selectMode`/`selectedKeys` 제외 inputs).
- `value = model<...>()` — 선택 결과 키(single=단일, multi=배열).
- `selectMode: "single"|"multi"` — 선택 모드. 기본 `"single"`.
- `disabled`/`required`(필수검증)/`inset`/`size` — 공통.
- `modalOptions` — `SdModalOptions` 전달.
- `searchIcon` — 검색 버튼 아이콘(기본 tablerSearch).

타입: `SdSelectModal<TKey>`(선택모달 인터페이스, `selectMode`/`selectedKeys` input 추가), `SdSelectModalInfo<T>`(`SdModalInfo` 에서 `selectMode`/`selectedKeys` 제외).

## SdTextfield

`<sd-textfield>` — 타입별 단일값 입력. 제네릭 `K extends keyof SdTextfieldTypes` 로 값 타입이 결정됨.

- `type = input.required<K>()` — 입력 타입(아래 `SdTextfieldTypes` 키). 값 타입·검증·표시 포맷을 결정.
- `value = model<SdTextfieldTypes[K]>()` — 값(타입별 number/string/DateOnly/DateTime/Time).
- `placeholder`/`title`/`inputStyle`/`inputClass` — 표시 부가.
- `disabled`/`readonly` — 비활성/읽기전용(둘 다 input 숨기고 텍스트만).
- `required`/`min`/`max`/`minlength`/`maxlength`/`pattern`/`validatorFn`/`format` — 검증 옵션. `validatorFn(value) => string | undefined` 는 커스텀 메시지, `format` 은 `type: "format"` 마스킹.
- `step`/`autocomplete` — 네이티브 속성.
- `useNumberComma` — number 타입 천단위 콤마. 기본 true.
- `minDigits` — number 표시 시 최소 소수 자릿수.
- `inline`/`inset`/`size`/`theme` — 공통 레이아웃.

`SdTextfieldTypes`(타입 키 → 값 타입): `number`→number, `text`/`password`/`color`/`email`/`format`→string, `date`/`month`/`year`→DateOnly, `datetime`/`datetime-sec`→DateTime, `time`/`time-sec`→Time. `sdTextfieldTypes` 는 이 키들의 배열.

```html
<sd-textfield [type]="'number'" [(value)]="qty" [min]="0" [required]="true" />
<sd-textfield [type]="'date'" [(value)]="orderDate" />
```

## SdTextarea

`<sd-textarea>` — 여러 줄 문자열 입력. `value = model<string>()`, `minRows`(최소 줄수, 내용 따라 자동 확장), `placeholder`/`title`/`disabled`/`readonly`/`required`/`inline`/`inset`/`size`/`theme`/`validatorFn`/`inputStyle`/`inputClass`.

## SdNumpad

`<sd-numpad>` — 터치 숫자패드. `value = model<number>()`, `placeholder`, `required`, `inputDisabled`(상단 입력칸 비활성), `useEnterButton`(ENT 버튼 표시), `useMinusButton`(부호 토글), `enterButtonClick = output()`(ENT 클릭).

## SdRange

`<sd-range>` — from~to 범위 입력(textfield 2개). 제네릭 `K extends keyof SdTextfieldTypes`. `type = input.required<K>()`, `from`/`to = model<SdTextfieldTypes[K]>()`(to 의 min 은 from 자동), `inputStyle`, `required`, `disabled`.

## SdDateRangePicker

`<sd-date-range-picker>` — 일/월/범위 기간 선택. `periodType = model<"일"|"월"|"범위">()`(기본 `"범위"`), `from`/`to = model<DateOnly>()`, `required`. 월 선택 시 from/to 를 해당 월 1일~말일로 동기화, 일 선택 시 to=from.

## SdCheckbox / SdSwitch / SdCheckboxGroup(Item)

- `<sd-checkbox>` — 체크박스/라디오. `value = model(false)`, `canChangeFn`(변경 허용 함수, `(boolean) => boolean|Promise<boolean>`), `radio`(라디오 외형·체크만 가능), `icon`(체크 아이콘), `disabled`/`size`/`inline`/`inset`/`theme`(공통 8색 + `"white"`), `contentStyle`. Space 키 토글.
- `<sd-switch>` — 토글 스위치. `value = model(false)`, `canChangeFn`, `disabled`/`inline`/`inset`/`size`/`theme`. on 시 success 색.
- `<sd-checkbox-group>` — 다중선택 그룹. `value = model<T[]>([])`(선택값 배열), `disabled`.
- `<sd-checkbox-group-item>` — 그룹 항목. `value = input.required<T>()`(항목 값), `inline`. 부모 group 의 배열에 포함되면 체크.

## SdSelect / SdSelectItem / SdSelectButton

- `<sd-select>` — 드롭다운 선택. 제네릭 `<M, T>`.
  - `selectMode: M("single"|"multi")` — 선택 모드. 기본 `"single"`.
  - `value = model<SelectModeValue<any>[M]>()` — single=단일값, multi=배열.
  - `placeholder`/`disabled`/`inline`/`inset`/`size`/`required` — 공통.
  - `hideSelectAll` — multi 의 전체선택/해제 바 숨김.
  - `multiSelectionDisplayDirection: "vertical"` — multi 선택 표시 줄바꿈.
  - `items`/`trackByFn`/`getChildrenFn` — 데이터 바인딩 방식(템플릿 `[itemOf]` 와 병행). `getChildrenFn` 지정 시 트리.
  - `contentClass`/`contentStyle`, `dropdownOpen = model(false)`.
  - `SelectModeValue<T>` = `{ multi: T[]; single: T }`.
- `<sd-select-item>` — 선택 항목. `value = input<T>()`, `disabled`, `hidden`. multi 면 체크박스 표시. 콘텐츠 HTML 이 선택 표시에 사용됨.
- `<sd-select-button>` — select 내부 우측 액션 버튼(ripple).

```html
<sd-select [(value)]="deptId" [required]="true">
  <sd-select-item [value]="undefined">미지정</sd-select-item>
  @for (d of depts) { <sd-select-item [value]="d.id">{{ d.name }}</sd-select-item> }
</sd-select>
```

## SdDropdown / SdDropdownPopup

- `<sd-dropdown>` — 트리거 + 팝업 래퍼. `open = model(false)`, `disabled`. 팝업은 body 로 이동·위치 자동 계산(상/하·좌/우), 모바일은 하단 시트 + 백드롭. ArrowDown/Up/Space/ESC 키 처리.
- `<sd-dropdown-popup>` — 팝업 콘텐츠. content 투영, 높이 300px 초과 시 스크롤 캡.

## SdForm

`<sd-form>` — 네이티브 검증 연동 폼 래퍼. `formSubmit = output<SubmitEvent>()`(검증 통과 시), `formInvalid = output()`(실패 시 `reportValidity` 후). `requestSubmit()` 메서드로 외부 제출. 내부 컨트롤의 `setupInvalid` 검증과 함께 동작.

## SdCollapse / SdCollapseIcon

- `<sd-collapse>` — 높이 애니메이션 접기. `open = input(false)`. 콘텐츠 높이 측정해 margin-top 으로 접음.
- `<sd-collapse-icon>` — 회전 화살표 아이콘. `icon`(기본 chevronDown), `open = input(false)`, `openRotate = input(90)`(열림 시 회전각).

## SdTab / SdTabItem

- `<sd-tab>` — 탭 바. `value = model<any>()` — 선택된 탭 값.
- `<sd-tab-item>` — 탭 항목. `value = input<any>()`. 부모 value 와 같으면 선택 표시, 클릭 시 부모 value set.

## SdList / SdListItem

- `<sd-list>` — 리스트 컨테이너. `inset = input(false)`(배경 투명).
- `<sd-list-item>` — 리스트 항목. `layout: "accordion"|"flat"`(기본 accordion; flat 은 그룹헤더+상시펼침), `open = model(false)`(아코디언 펼침), `selected`, `selectedIcon`(선택 표시 아이콘), `readonly`, `contentStyle`/`contentClass`. 자식 `<sd-list>` 투영 시 하위 트리. `#toolTpl` 로 우측 도구 영역.

## SdGap

`<sd-gap>` — 빈 간격. `height`/`width: "xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl"`(CSS 변수 기반), `heightPx`/`widthPx`/`widthEm`(수치). 0 이면 `display:none`, width 계열이면 inline-block, height 면 block.

## SdPagination

`<sd-pagination>` — 페이지 네비. `currentPage = model(0)`(0-base 현재 페이지), `totalPageCount = input(0)`(전체 페이지 수), `visiblePageCount = input(10)`(한 그룹에 보일 페이지 버튼 수). 처음/이전그룹/페이지번호/다음그룹/마지막 버튼.
