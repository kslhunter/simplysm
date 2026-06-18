# @simplysm/angular — 폼·입력 컨트롤

버튼·앵커, 텍스트/숫자/날짜 입력, 체크박스/스위치/그룹, 셀렉트/드롭다운, 폼/접기/탭/리스트/갭/페이지네이션 등 폼·UI 기본 컨트롤 군. 화면 폼·필터·시트 셀에서 함께 쓰임. 화면 폼·버튼 스타일 규약은 [client-component.md](../manuals/client-component.md) 의 '폼·입력 컨트롤' / '버튼 스타일' 참조.

공통 약속: 대부분 컨트롤이 `size: "sm"|"lg"`(미지정=기본 중간), `inline`(인라인 배치·폭 auto), `inset`(테두리·라운드 제거, 셀/다른 컨트롤 내장용), `disabled`, `theme` 을 가짐. 모든 boolean input 은 `booleanAttribute` 변환이라 `<sd-x inline>` 처럼 빈 속성=`true`. **표준 테마 셋** = `primary | secondary | info | success | warning | danger | gray | blue-gray`. 검증 컨트롤은 `required`/`validatorFn` 으로 `sd-form` 의 native validity 에 연동.

## 버튼

### `SdButton` — `<sd-button>`

- `type: "button"|"submit"` (기본 `"button"`) — native 버튼 타입. `"submit"` 은 감싼 `<form>` 제출 트리거, `"button"` 은 안 함.
- `theme` — 표준 테마 셋(채워진 버튼) + `link`(투명·primary 텍스트) + `link-primary`…`link-blue-gray`(투명·해당 테마 색 텍스트) + `link-rev`(투명·다크 배경용 밝은 텍스트). 미지정 시 기본 컨트롤색 버튼. 화면 액션 역할별 사용은 매뉴얼 '버튼 스타일' 표.
- `inline: boolean` — true 면 `inline-block`·width auto (내용 크기로 축소). 시트 위/폼 인라인 버튼에.
- `inset: boolean` — true 면 테두리·라운드 제거, primary 텍스트색(다른 컨트롤에 flush 내장).
- `size: "xs"|"sm"|"lg"` — 패딩 스케일. `xs` 최소·`sm` 작음·미지정 중간·`lg` 큼. 시트 위 버튼은 `sm`.
- `disabled: boolean` — true 면 native 버튼 비활성 + ripple 억제.
- `buttonStyle: string` / `buttonClass: string` — 내부 `<button>` 에 적용할 인라인 스타일/클래스.

```html
<sd-button [theme]="'primary'" (click)="onSubmit()">저장</sd-button>
<sd-button [size]="'sm'" [theme]="'link-success'" (click)="onDownload()">엑셀 다운로드</sd-button>
```

### `SdAnchor` — `<sd-anchor>`

- `theme` — 표준 테마 셋(기본 `"primary"`). 텍스트 색; hover 시 밑줄·진해짐.
- `disabled: boolean` — true 면 opacity 0.3·`pointer-events:none`·tabindex 제거.

시트 셀 안 진입점 앵커 등에 사용([client-crud.md](../manuals/client-crud.md) 의 '#' 컬럼 편집 진입 패턴).

### `SdAdditionalButton` — `<sd-additional-button>`

좌측에 자유 콘텐츠(`._content` flex-fill), 우측에 투영된 `sd-anchor`/`sd-button` 을 배치하는 테두리 컨테이너.

- `size: "sm"|"lg"` — 콘텐츠/버튼 패딩 스케일.
- `inset: boolean` — true 면 테두리·라운드 제거.

### `SdModalSelectButton<K, M>` — `<sd-modal-select-button>`

값을 모달로 선택하는 버튼(검색 버튼 클릭 → 모달 → 선택 키 반영). `M extends "single"|"multi"`.

- `modal: SdSelectModalInfo<SdSelectModal<K>>` (required) — 검색 시 열 모달 정의. `SdSelectModal<K>` = `SdModalContentDef<SelectModalOutputResult<K>>` + `selectMode`/`selectedKeys` input 을 가진 컴포넌트(버튼이 그 둘을 주입하므로 `inputs` 에서 제외됨).
- `value: model<SelectModeValue<K>[M]>` — single 이면 `K`, multi 면 `K[]`.
- `selectMode: M` (기본 `"single"`) — `"single"` = 단일 키, eraser 가 `undefined` 로 초기화; `"multi"` = `K[]`, eraser 가 `[]` 로 초기화.
- `required: boolean` — true 면 빈 값일 때 "선택된 항목이 없습니다." 검증 + eraser 숨김.
- `disabled: boolean` — true 면 검색·eraser 버튼 숨김.
- `inset: boolean` / `size: "sm"|"lg"` — 스타일.
- `modalOptions: SdModalOptions` — 모달 provider 로 전달할 옵션.
- `searchIcon` (기본 `tablerSearch`) — 검색 버튼 아이콘.
- 메서드: `onSearchClick(event)` — 모달을 `selectMode`·현재 `selectedKeys` 로 열고, 확정 시 value 갱신. `onEraseClick()` — 값 클리어.

```html
<sd-modal-select-button [(value)]="data().customerId" [modal]="{ type: CustomerList, title: '고객사', inputs: {} }" />
```

## 입력

### `SdTextfield<K>` — `<sd-textfield>`

값 타입은 `type` input 으로 결정(`SdTextfieldTypes[K]`).

- `type: K` (required) — `SdTextfieldTypes` 키 중 하나(아래). parse/format/validate 핸들러와 native 컨트롤 타입을 결정.
- `value: model<SdTextfieldTypes[K]>` — 타입드 값(`number`/`string`/`DateOnly`/`DateTime`/`Time`).
- `placeholder` / `title` — placeholder 텍스트; `title` 미지정 시 placeholder 사용.
- `disabled: boolean` — true 면 `<input>` 미렌더, 읽기전용 display 박스(회색).
- `readonly: boolean` — true 면 display 텍스트만 표시.
- `required: boolean` — true 면 빈 값일 때 "값을 입력하세요.".
- `min`/`max: SdTextfieldTypes[K]` — 타입드 경계. 위반 시 "…보다 크거나/작거나 같아야 합니다.".
- `minlength`/`maxlength: number` — 문자열 길이 경계(text/email/password).
- `pattern: string` — 정규식(문자열 타입); 불일치 시 "입력 값이 형식에 맞지 않습니다.".
- `validatorFn: (value) => string | undefined` — 커스텀 검증; 반환 문자열이 에러에 추가.
- `format: string` — `type="format"` 용 `X` 마스크(예 `XXX-XXXX|XXX-XXX-XXXX`, `|` 로 대안). 비-`X` 리터럴을 파싱 시 제거·표시 시 재삽입.
- `step: number` — native step 재정의.
- `autocomplete: string` — native autocomplete.
- `useNumberComma: boolean` (기본 `true`) — number 일 때 천단위 콤마 표시. `false` 면 plain `toString`.
- `minDigits: number` — number 표시 시 최소 소수 자릿수.
- `inline`/`inset`/`size: "sm"|"lg"`/`theme`(표준 테마 셋, 배경 틴트) — 스타일.

`SdTextfieldTypes` 키별 값 타입(`type` 으로 지정):

- `number → number` — 숫자 입력(`useNumberComma`·`min`/`max`).
- `text → string` / `email → string` / `password → string` — 문자열(길이·패턴 적용).
- `color → string` — native `type=color`(길이·패턴 미적용).
- `format → string` — `format` 마스크.
- `date → DateOnly`(`yyyy-MM-dd`) / `month → DateOnly`(`yyyy-MM`) / `year → DateOnly`(text, `yyyy`).
- `datetime → DateTime`(`datetime-local`) / `datetime-sec → DateTime`(초 포함, default step 1).
- `time → Time`(`HH:mm`) / `time-sec → Time`(초 포함, default step 1).

`sdTextfieldTypes: (keyof SdTextfieldTypes)[]` — 위 키 전체의 순서 배열(셀렉트 옵션 등에 사용).

```html
<sd-textfield [type]="'text'" [(value)]="filter().searchText" (valueChange)="mark(filter)" />
<sd-textfield [type]="'number'" [(value)]="data().qty" (valueChange)="mark(data)" />
```

### `SdTextarea` — `<sd-textarea>`

- `value: model<string>` — 빈 값이면 `undefined`.
- `minRows: number` (기본 1) — 실제 행 수 = `max(minRows, 줄 수)`.
- `disabled`/`readonly: boolean` — 정적 display 박스.
- `required: boolean` — 빈 값일 때 "값을 입력하세요.".
- `inline`/`inset`/`size: "sm"|"lg"`/`theme`/`validatorFn`/`inputStyle`/`inputClass`.

### `SdNumpad` — `<sd-numpad>`

화면 숫자 키패드 + textfield 표시.

- `value: model<number>` — 파싱된 값(내부 `text` 와 동기).
- `placeholder` / `required: boolean`(빈 값이면 ENT 비활성) / `inputDisabled: boolean`(상단 textfield 비활성, 키패드는 사용 가능).
- `useEnterButton: boolean` — true 면 ENT 버튼 표시 → `enterButtonClick` emit.
- `useMinusButton: boolean` — true 면 `-` 부호 토글 버튼 표시.
- `enterButtonClick: output()` — ENT 클릭 시.

### `SdRange<K>` — `<sd-range>`

`~` 로 묶인 두 `sd-textfield`(`to.min` 은 `from` 에 바인딩).

- `type: K` (required) — 양끝 textfield 타입.
- `from`/`to: model<SdTextfieldTypes[K]>` — 범위 양끝.
- `required: boolean`(양끝 적용) / `disabled: boolean`(양끝 비활성) / `inputStyle`.

### `SdDateRangePicker` — `<sd-date-range-picker>`

기간 타입 셀렉트 + 날짜/월/범위 입력.

- `periodType: model<"일"|"월"|"범위">` (기본 `"범위"`) — `"일"` = 단일 날짜(to=from); `"월"` = 월 필드(범위를 그달 1일~말일로); `"범위"` = 두 날짜 필드 range.
- `from`/`to: model<DateOnly>` — 결과 범위(`"범위"` 에서 `to ≥ from` 클램프).
- `required: boolean` — 내부 필드 적용.

```html
<sd-date-range-picker [(from)]="filter().fromDate" [(to)]="filter().toDate" (fromChange)="mark(filter)" (toChange)="mark(filter)" />
```

## 체크박스·스위치

### `SdCheckbox` — `<sd-checkbox>`

- `value: model(false)` — 체크 상태.
- `radio: boolean` — true 면 라디오 외형(원형·채운 점)이며 클릭은 항상 `true` 로(해제 불가); false 면 토글 체크박스.
- `canChangeFn: (item: boolean) => boolean | Promise<boolean>` (기본 `() => true`) — 변경 가드(`setupModelHook`). `false`/reject 면 변경 거부.
- `icon` (기본 `tablerCheck`) — 체크 아이콘(라디오 모드에선 무시).
- `disabled`/`size: "sm"|"lg"`/`inline`/`inset`/`contentStyle`.
- `theme` — 표준 테마 셋 + `white`(흰 배경·연한 테두리·체크 시 primary).

```html
<sd-checkbox [(value)]="data().isActive" (valueChange)="mark(data)">활성</sd-checkbox>
<sd-checkbox [radio]="true" [value]="mode() === 'a'" (valueChange)="mode.set('a')">A</sd-checkbox>
```

### `SdSwitch` — `<sd-switch>`

- `value: model(false)` — on/off.
- `canChangeFn` — 변경 가드(기본 `() => true`).
- `theme`(표준 테마 셋, on 트랙 색·기본 success) / `disabled`/`inline`/`inset`/`size: "sm"|"lg"`.

### `SdCheckboxGroup<T>` / `SdCheckboxGroupItem<T>` — `<sd-checkbox-group>` / `<sd-checkbox-group-item>`

- 그룹: `value: model<T[]>([])` — 선택 항목 배열. `disabled: boolean` — 자식에 전파.
- 아이템: `value: input.required<T>()` — 이 항목 값. `inline: boolean`. 클릭 시 부모 배열에 추가/제거.

## 셀렉트·드롭다운

### `SdSelect<M, T>` — `<sd-select>`

`SelectModeValue<T> = { multi: T[]; single: T }`.

- `selectMode: M` (기본 `"single"`) — `"single"`(단일 값, 선택 시 닫힘) / `"multi"`(배열 값, 체크박스·전체선택 바, 열린 채 유지).
- `value: model<SelectModeValue<any>[M]>` — 선택 값(들).
- `placeholder: string` — 미선택 시 회색 표시.
- `required: boolean` — 빈 값(null/빈 배열)일 때 "선택된 항목이 없습니다.".
- `hideSelectAll: boolean` — true 면 multi 모드 "전체선택/전체해제" 바 숨김.
- `multiSelectionDisplayDirection: "vertical"` — multi 선택 라벨을 세로 스택(기본 인라인 콤마).
- `items: T[]` — 템플릿 구동 렌더용 데이터(`SdItemOfTemplate` 와 함께). `trackByFn`/`getChildrenFn`(계층 평탄화) 동반.
- `disabled`/`inline`/`inset`/`size: "sm"|"lg"`/`contentClass`/`contentStyle`.
- `dropdownOpen: model(false)` — 열림 상태.

정적 선택지는 `<sd-select-item>` 자식으로 구성:

```html
<sd-select [(value)]="data().state" (valueChange)="mark(data)">
  <sd-select-item [value]="'작성'">작성</sd-select-item>
  <sd-select-item [value]="'승인'">승인</sd-select-item>
</sd-select>
```

### `SdSelectItem<T>` — `<sd-select-item>`

- `value: T | undefined` — 이 항목 값.
- `disabled: boolean` — 회색·비클릭, 전체선택 제외.
- `hidden: boolean` — `display:none`, 전체선택 제외.

### `SdSelectButton` — `<sd-select-button>`

`sd-select` 우측에 슬롯되는 액션 버튼. input/output 없음(ripple 만 설정).

### `SdDropdown` / `SdDropdownPopup` — `<sd-dropdown>` / `<sd-dropdown-popup>`

트리거 + body-append 팝업. 모바일(≤520px)은 backdrop 바텀시트, 데스크탑은 인접 배치.

- 드롭다운: `open: model(false)` — 열림 상태. `disabled: boolean` — true 면 tabindex 제거·열기 차단.
- 팝업: 콘텐츠 300px 초과 시 자체 높이 캡. input 없음.

```html
<sd-dropdown [(open)]="open">
  <div>트리거</div>
  <sd-dropdown-popup>...</sd-dropdown-popup>
</sd-dropdown>
```

## 폼

### `SdForm` — `<sd-form>`

native `<form novalidate>` + 숨김 submit 버튼 래퍼. 폼 안 Enter 자동 제출에. (`sd-crud-list`/`sd-crud-detail` 은 이미 내장하므로 별도 래핑 불필요)

- `formSubmit: output<SubmitEvent>` — `checkValidity()` 통과 시 emit.
- `formInvalid: output()` — 검증 실패 시(`reportValidity()` 로 메시지·포커스 후).
- 메서드: `requestSubmit()` — 프로그래밍 제출. `get formEl(): HTMLFormElement`.

```html
<sd-form (formSubmit)="onSearch()">...<sd-button [type]="'submit'">조회</sd-button></sd-form>
```

## 접기·탭·리스트

### `SdCollapse` / `SdCollapseIcon` — `<sd-collapse>` / `<sd-collapse-icon>`

- collapse: `open: boolean` — true 면 펼침(margin-top 0), false 면 접힘(`-{높이}px`). 애니메이션 0.1s.
- icon: `open: boolean` — true 면 `openRotate` 도 회전. `openRotate: number`(기본 90) — 펼침 시 회전 각도. `icon`(기본 `tablerChevronDown`).

### `SdTab` / `SdTabItem` — `<sd-tab>` / `<sd-tab-item>`

현재 탭 값을 고르는 **선택 컨트롤**(콘텐츠 컨테이너 아님). 콘텐츠는 바깥 `@if`/`@switch` 로 분기. 표준 패턴은 [client-tab.md](../manuals/client-tab.md).

- 탭: `value: model<any>` — 현재 선택값(양방향 필수).
- 탭아이템: `value: any` — 이 항목 식별값. 클릭 시 부모 `value` 로 set, 부모 값과 비교해 선택 자동 결정.

```html
<sd-tab [(value)]="activeTab">
  <sd-tab-item [value]="'info'">기본정보</sd-tab-item>
  <sd-tab-item [value]="'history'">이력</sd-tab-item>
</sd-tab>
```

### `SdList` / `SdListItem` — `<sd-list>` / `<sd-list-item>`

- list: `inset: boolean` — true 면 투명 배경·테두리 제거(카드 chrome 제거). 중첩 리스트는 항상 chrome 없음.
- item: `layout: "accordion"|"flat"` (기본 `"accordion"`) — `"accordion"` = 자식 클릭 접기/펼치기·chevron·들여쓰기; `"flat"` = 자식 항상 표시, 자식 가진 항목은 작은 섹션 헤더로(비클릭).
  - `open: model(false)` — accordion 펼침 상태.
  - `selected: boolean` — 강조/볼드. `selectedIcon: string` — leaf 선두 아이콘(선택 시 primary).
  - `readonly: boolean` — 비대화(기본 커서·ripple 없음·클릭 무시).
  - `contentStyle`/`contentClass`, `#toolTpl` — 우측 도구 템플릿.

## 갭·페이지네이션

### `SdGap` — `<sd-gap>`

스페이서. width 입력이 height 보다 우선.

- `height` / `width: "xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl"` — 명명 갭 토큰(`--gap-{key}`). height 는 `display:block`, width 는 `inline-block`.
- `heightPx`/`widthPx`/`widthEm: number` — 명시 px/em. `0` 이면 `display:none`.

### `SdPagination` — `<sd-pagination>`

처음/이전그룹/페이지번호/다음그룹/마지막. 내부 0-base, 표시 1-base. (`sd-sheet`/`sd-crud-list` 가 내장하므로 단독 사용은 드묾)

- `currentPage: model(0)` — 0-base 현재 페이지.
- `totalPageCount: number` (기본 0) — 총 페이지. `0` 이면 페이지 없음·내비 비활성.
- `visiblePageCount: number` (기본 10) — 그룹당 페이지 번호 개수.
- 메서드: `goToPage(page)`/`goToNextGroup()`/`goToPrevGroup()`/`goToFirst()`/`goToLast()`.
