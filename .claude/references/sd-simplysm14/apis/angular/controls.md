# @simplysm/angular — 폼·입력 컨트롤

버튼·앵커, 텍스트/숫자/날짜 입력, 체크박스/스위치, 셀렉트/드롭다운, 폼/접기/탭/리스트/페이지네이션 등 폼·UI 기본 컨트롤 군. 화면 폼·필터·시트 셀에서 함께 쓰임. 공통: 대부분 컨트롤이 `size: "sm"|"lg"`(미지정=기본), `inline`(인라인 배치), `inset`(테두리 제거·셀 내장용), `disabled`, `theme` 을 가짐. 값 입력 컨트롤은 `model()` 양방향, 검증 컨트롤은 `required`/`validatorFn` 보유.

## 버튼

### SdButton — `<sd-button>`

```ts
type = input<"button" | "submit">("button");
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"
  | "link"|"link-primary"|...|"link-blue-gray"|"link-rev">();
inline; inset; disabled; size = input<"xs"|"sm"|"lg">();
buttonStyle = input<string>(); buttonClass = input<string>();
```

- `type` — `"submit"` 이면 폼 제출 트리거(sd-form 안에서). 기본 `"button"`.
- `theme` — 채움 테마 또는 `link-*`(테두리·배경 없는 링크형), `link-rev`(어두운 배경용 반전). 액션 강조면 채움, 보조면 link.
- `inset` — 테두리·라운드 제거 후 primary 텍스트색(셀·툴바 내장 버튼). `size="xs"` 는 가장 촘촘한 패딩.
- `buttonStyle`/`buttonClass` — 내부 `<button>` 에 직접 적용할 style/class 문자열.

```html
<sd-button [type]="'submit'" [theme]="'primary'">저장</sd-button>
```

### SdAnchor — `<sd-anchor>`

```ts
disabled = input(false);
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">("primary");
```

- 텍스트 링크형 클릭 요소. `disabled` 면 흐려지고 tabindex 제거. 아이콘/짧은 액션에 사용.

### SdAdditionalButton — `<sd-additional-button>`

```ts
size = input<"sm" | "lg">();
inset = input(false);
```

- 본문(좌) + 우측 버튼 영역 묶음 컨트롤. `<sd-anchor>`/`<sd-button>` 을 콘텐츠로 투영하면 우측 버튼 영역에 배치. 값 표시 + 보조 액션 조합용.

### SdModalSelectButton — `<sd-modal-select-button>`

```ts
modal = input.required<SdSelectModalInfo<SdSelectModal<K>>>();
value = model<SelectModeValue<K>[M]>();
disabled; required; inset; size = input<"sm"|"lg">();
selectMode = input<M>("single"); // "single" | "multi"
modalOptions = input<SdModalOptions>();
searchIcon = input(tablerSearch);
// SdSelectModal<TKey> = SdModalContentDef<SelectModalOutputResult<TKey>> + selectMode/selectedKeys inputs
// SdSelectModalInfo<T> = SdModalInfo<T, "selectMode" | "selectedKeys">
```

- 모달로 선택해 값을 채우는 버튼. 검색 버튼 클릭 시 `modal` 을 띄워(현재 값·selectMode 자동 주입) 결과 `{ selectedKeys }` 로 `value` 갱신.
- `selectMode` — `"single"`=`value` 가 단일 키, `"multi"`=키 배열. 지우기(eraser) 버튼은 `required=false` 이고 값이 있을 때만 노출.
- `required` 면 빈 선택 시 native invalid(`setupInvalid`). `modal` 은 `SdSelectModal` 계약(selectMode input + selectedKeys model)을 구현한 모달.

## 텍스트·숫자·날짜 입력

### SdTextfield — `<sd-textfield>`

```ts
value = model<SdTextfieldTypes[K]>();
type = input.required<K>(); // K extends keyof SdTextfieldTypes
placeholder; title; inputStyle; inputClass;
disabled; readonly; required;
min/max = input<SdTextfieldTypes[K]>(); minlength; maxlength; pattern = input<string>();
validatorFn = input<(value) => string | undefined>(); format = input<string>();
step; autocomplete; useNumberComma = input(true); minDigits = input<number>();
inline; inset; size = input<"sm"|"lg">(); theme;
// SdTextfieldTypes: number, text, password, color, email, format,
//   date/month/year(DateOnly), datetime/datetime-sec(DateTime), time/time-sec(Time)
```

- `type` — 값 타입을 결정(제네릭으로 `value` 타입 추론). 날짜·시간 타입은 `DateOnly`/`DateTime`/`Time` 객체를 값으로 주고받음(문자열 아님).
- `format` — `type="format"` 에서 `X` 자리 마스크(예: `"XXX-XXXX"`, `|` 로 길이 분기). `type="number"` 의 `useNumberComma`=천단위 콤마 표시, `minDigits`=최소 소수자릿수.
- `required`/`min`/`max`/`minlength`/`maxlength`/`pattern`/`validatorFn` — 타입별 핸들러 + 사용자 함수로 검증, 실패 시 native invalid 표시. `readonly`/`disabled` 면 input 대신 표시용 텍스트만 렌더.
- `sdTextfieldTypes` — `(keyof SdTextfieldTypes)[]` 상수. 타입 목록을 순회/검증할 때 사용.

```html
<sd-textfield [type]="'number'" [(value)]="qty" [required]="true" [min]="1" />
<sd-textfield [type]="'date'" [(value)]="orderDate" />
```

### SdTextarea — `<sd-textarea>`

```ts
value = model<string>();
placeholder; title; minRows = input(1);
disabled; readonly; required; inline; inset; size = input<"sm"|"lg">();
validatorFn = input<(value: string | undefined) => string | undefined>();
theme; inputStyle; inputClass;
```

- 여러 줄 텍스트. 행 수는 `minRows` 와 줄바꿈 개수 중 큰 값으로 자동 확장. 빈 입력은 undefined(결측 보존).

### SdNumpad — `<sd-numpad>`

```ts
value = model<number>(); placeholder; required;
inputDisabled = input(false); useEnterButton = input(false); useMinusButton = input(false);
enterButtonClick = output();
```

- 터치 숫자 키패드. 상단 표시 textfield + 0~9·소수점·BS·C 버튼. `useEnterButton`=ENT 버튼 노출(눌리면 `enterButtonClick`), `useMinusButton`=부호 토글 버튼, `inputDisabled`=상단 직접 입력 차단(버튼만).

### SdRange — `<sd-range>`

```ts
type = input.required<K>(); // keyof SdTextfieldTypes
from = model<SdTextfieldTypes[K]>(); to = model<SdTextfieldTypes[K]>();
inputStyle; required; disabled;
```

- `from ~ to` 두 textfield 묶음. `to` 의 min 이 `from` 으로 자동 설정. 날짜/숫자 범위 입력에 사용.

### SdDateRangePicker — `<sd-date-range-picker>`

```ts
periodType = model<"일" | "월" | "범위">("범위");
from = model<DateOnly>(); to = model<DateOnly>(); required;
```

- 기간 선택. `periodType` `"일"`=단일 날짜(from=to), `"월"`=해당 월 1일~말일 자동 세팅, `"범위"`=from/to 직접. 검색 필터의 기간 조건에 사용.

## 체크박스·스위치

### SdCheckbox — `<sd-checkbox>`

```ts
value = model(false);
canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
icon = input(tablerCheck); radio = input(false); disabled;
size = input<"sm"|"lg">(); inline; inset;
theme = input<...|"white">(); contentStyle = input<string>();
```

- `value` — 체크 상태(model 양방향). `canChangeFn` 이 false 반환 시 변경 거부(`setupModelHook`), Promise 면 비동기 확인 후 적용.
- `radio` — true 면 라디오 외형(클릭 시 항상 true 로만 set, 해제 불가). `icon` 으로 체크 아이콘 교체, `theme="white"` 는 어두운 배경용.

### SdSwitch — `<sd-switch>`

```ts
value = model(false);
canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);
disabled; inline; inset; size = input<"sm"|"lg">(); theme;
```

- 토글 스위치. on 이면 success(또는 `theme`) 색. `canChangeFn` 동작은 체크박스와 동일.

### SdCheckboxGroup / SdCheckboxGroupItem — `<sd-checkbox-group>` / `<sd-checkbox-group-item>`

```ts
// group
value = model<T[]>([]); disabled = input(false);
// item
value = input.required<T>(); inline = input(false);
```

- 그룹은 선택된 값 배열(`T[]`)을 보유. 각 item 의 `value` 가 그룹 배열에 포함되면 체크, 토글 시 배열에서 추가/제거. 다중 선택 묶음에 사용.

## 선택(select)·드롭다운

### SdSelect — `<sd-select>`

```ts
selectMode = input("single"); // "single" | "multi"
value = model<SelectModeValue<any>[M]>(); // single=T, multi=T[]
placeholder; disabled; inline; inset; size = input<"sm"|"lg">(); required;
hideSelectAll = input(false); multiSelectionDisplayDirection = input<"vertical">();
items = input<T[]>(); trackByFn = input<(item, index) => unknown>((item)=>item);
getChildrenFn = input<(item: T) => T[] | undefined>();
contentClass; contentStyle; dropdownOpen = model(false);
// SelectModeValue<T> = { multi: T[]; single: T }
selectItem(v); toggleItem(v); onSelectAll(); onDeselectAll(); openDropdown(); closeDropdown();
```

- `selectMode` — `"single"`=단일(선택 시 닫힘), `"multi"`=다중(체크박스·전체선택바). `value` 타입이 모드에 따라 분기.
- 항목은 `<sd-select-item>` 을 콘텐츠로 두거나 `items`+`itemOf` 템플릿으로 렌더. `getChildrenFn` 지정 시 트리 평탄화. `hideSelectAll`=multi 전체선택바 숨김, `multiSelectionDisplayDirection="vertical"`=선택 표시 세로 나열.
- `#headerTpl`/`#beforeTpl`/`itemOf` 템플릿 슬롯으로 검색바·상단 항목·반복 항목 커스터마이즈. `<sd-select-button>` 콘텐츠는 우측 액션 버튼으로 투영.

```html
<sd-select [(value)]="status" [required]="true">
  <sd-select-item [value]="'active'">사용</sd-select-item>
  <sd-select-item [value]="'inactive'">미사용</sd-select-item>
</sd-select>
```

### SdSelectItem — `<sd-select-item>`

```ts
value = input<T | undefined>(undefined); disabled = input(false); hidden = input(false);
```

- 한 선택 항목. multi 모드면 좌측 체크박스 자동 표시. `value` 가 부모 select 값과 매칭되면 선택 강조. `hidden`=DOM 유지하되 숨김(검색 필터 등).

### SdSelectButton — `<sd-select-button>`

```ts
// 입력 없음. 콘텐츠 투영용.
```

- select 우측에 붙는 액션 버튼 슬롯(ripple 내장). 관리/검색 모달 트리거 등에 사용.

### SdDropdown / SdDropdownPopup — `<sd-dropdown>` / `<sd-dropdown-popup>`

```ts
// dropdown
open = model(false); disabled = input(false);
// popup: 입력 없음
```

- 임의 콘텐츠를 여는 드롭다운. 트리거 콘텐츠 + `<sd-dropdown-popup>` 한 쌍. 열리면 popup 을 body 로 이동해 위치 계산(모바일은 하단 시트 + backdrop). 키보드 ↑/↓/Esc/Space 로 열고닫기·이동. select·테마셀렉터·탑바메뉴가 내부 사용.

## 폼·접기·탭·리스트·기타

### SdForm — `<sd-form>`

```ts
formElRef = viewChild.required<ElementRef<HTMLFormElement>>("formEl");
get formEl: HTMLFormElement;
formSubmit = output<SubmitEvent>(); formInvalid = output();
requestSubmit(): void;
```

- native form 래퍼. 제출 시 `checkValidity()` 통과하면 `formSubmit`, 실패하면 `reportValidity()` 후 `formInvalid`. `requestSubmit()` 으로 외부에서 제출 트리거(CTRL+S 등).

```html
<sd-form (formSubmit)="onSubmit()"> ... <sd-button [type]="'submit'">저장</sd-button> </sd-form>
```

### SdCollapse / SdCollapseIcon — `<sd-collapse>` / `<sd-collapse-icon>`

```ts
// collapse
open = input(false);
// collapse-icon
icon = input(tablerChevronDown); open = input(false); openRotate = input(90);
```

- `sd-collapse` 는 `open` 에 따라 콘텐츠 높이를 애니메이션 접기/펼치기. `sd-collapse-icon` 은 `open` 시 `openRotate`(deg) 회전하는 펼침 표시 아이콘(보통 collapse 헤더에 동반).

### SdTab / SdTabItem — `<sd-tab>` / `<sd-tab-item>`

```ts
// tab
value = model<any>();
// tab-item
value = input<any>();
```

- `sd-tab` 은 현재 탭 값을 고르는 선택 컨트롤(콘텐츠 컨테이너 아님). `sd-tab-item` 의 `value` 가 부모 값과 같으면 선택. 콘텐츠 분기는 바깥에서 `@if`/`@switch` 로. 값 시그널은 literal union 으로.

```html
<sd-tab [(value)]="activeTab">
  <sd-tab-item [value]="'info'">기본정보</sd-tab-item>
  <sd-tab-item [value]="'history'">이력</sd-tab-item>
</sd-tab>
```

### SdList / SdListItem — `<sd-list>` / `<sd-list-item>`

```ts
// list
inset = input(false);
// list-item
layout = input<"accordion" | "flat">("accordion");
open = model(false); selected = input(false); selectedIcon = input<string>();
readonly = input(false); contentStyle; contentClass;
// #toolTpl 슬롯, 중첩 <sd-list> 로 트리
```

- `inset` — 카드 외형(테두리·배경) 제거(임베드용). list-item 의 `layout` `"accordion"`=클릭 시 자식 펼침(트리), `"flat"`=섹션 헤더(항상 펼침).
- `selected`=선택 강조, `selectedIcon`=리프 항목 좌측 선택 아이콘, `readonly`=클릭 펼침 비활성. 자식 `<sd-list>` 중첩으로 다단 트리. 사이드바 메뉴가 이를 사용.

### SdGap — `<sd-gap>`

```ts
height/width = input<"xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl">();
heightPx; widthPx; widthEm = input<number>();
```

- 간격 스페이서. 토큰(`height`/`width`) 또는 px/em 으로 지정. width 류면 inline-block, height 면 block, 값 0 이면 미표시.

### SdPagination — `<sd-pagination>`

```ts
currentPage = model(0); // 0-based
totalPageCount = input(0); visiblePageCount = input(10);
goToPage(p); goToFirst(); goToLast(); goToNextGroup(); goToPrevGroup();
```

- 페이지 네비게이션. `currentPage` 는 0-base 양방향. `visiblePageCount` 묶음 단위로 이전/다음 그룹·처음/끝 이동. 시트·리스트 페이징에 사용.
