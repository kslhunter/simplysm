# @simplysm/angular — visual

시각/표시 컴포넌트 (라벨·뱃지·진행률·달력·바코드·차트·에디터·주소검색) + 보조 레이아웃 컨테이너 (collapse·tab·list·gap·pagination·dropdown).

## SdLabel — `<sd-label>`

```ts
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">();
color = input<string>();      // 직접 색상 hex
clickable = input(false);
```

- 작은 텍스트 뱃지. `theme` 또는 `color` 중 하나. `clickable=true` 면 커서 pointer + 호버 효과.

## SdNote — `<sd-note>`

```ts
theme = input<...8 themes>();
size = input<"sm"|"lg">();
inset = input(false);
```

- 정보 박스(노트). `<ng-content>` 가 본문. 페이지 안내문구.

## SdProgress — `<sd-progress>`

```ts
inset = input(false); size = input<"sm"|"lg">();
theme = input.required<...8 themes>();
value = input.required<number>();   // 0~100
```

- 가로 진행 바. value/100 만큼 채움.

## SdCalendar — `<sd-calendar>`

```ts
class SdCalendar<T>
items = input.required<T[]>();
getItemDateFn = input.required<(item: T, index: number) => DateOnly>();
yearMonth = input(new DateOnly().setDay(1));
weekStartDay = input(0);          // 0=일요일, 1=월요일
minDaysInFirstWeek = input(1);
// 자식: <ng-template itemOf>...</ng-template> 로 셀별 아이템 렌더
```

- 월별 달력 그리드. 각 날짜 셀에 해당하는 items 만 추려 itemOf 템플릿으로 렌더.
- `weekStartDay` — 0~6.
- `minDaysInFirstWeek` — 첫 주에 포함될 최소 일수(ISO 주차 규칙).

```html
<sd-calendar [items]="events()" [getItemDateFn]="getDate" [yearMonth]="ym()">
  <ng-template itemOf [itemOf]="events()" let-item>{{ item.title }}</ng-template>
</sd-calendar>
```

## SdBarcode — `<sd-barcode>`

```ts
type = input.required<BarcodeType>();
value = input<string>();

type BarcodeType = "code128"|"qrcode"|"ean13"|"ean8"|"code39"|... (bwip-js bcid 전체)
```

- bwip-js 로 SVG 바코드 렌더. value 비면 빈 출력. 인식 불가 데이터면 catch 후 빈 출력.

## SdEcharts — `<sd-echarts>`

```ts
option = input.required<echarts.EChartsOption>();
notMerge = input(false);    // setOption merge 비활성
loading = input(false);     // showLoading/hideLoading
```

- ECharts 래퍼. `option` 변경 시 자동 setOption.

## SdTiptapEditor — `<sd-tiptap-editor>`

```ts
value = model<string>();              // HTML 문자열
disabled = input(false); readonly = input(false); required = input(false);
placeholder = input<string>();
validatorFn = input<(value) => string|undefined>();
extensions = input<AnyExtension[]>();  // 추가 tiptap extensions
```

- WYSIWYG HTML 에디터. tiptap 기반. 기본 extension(헤딩/볼드/리스트 등) 내장.

## SdAddressSearchModal — `<sd-address-search-modal>` (SdModalContentDef<Address>)

```ts
close = output<Address>();
initialized = signal(false);
interface Address { postNumber: string|undefined; address: string|undefined; buildingName: string|undefined; }
```

- 다음(daum) 우편번호 검색 위젯 모달. `SdModalProvider.showAsync({ type: SdAddressSearchModal, ... })` 로 호출.
- 다음 postcode 스크립트 로드 실패 시 에러 메시지 표시.

## SdCollapse — `<sd-collapse>`

```ts
open = input(false);
```

- 접힘/펼침 컨테이너. transition 으로 height 애니메이션. `<ng-content>` 가 본문.

## SdCollapseIcon — `<sd-collapse-icon>`

```ts
icon = input(tablerChevronDown);
open = input(false);
openRotate = input(90);     // open 일 때 회전 각도
```

- 펼침/접힘 표시 아이콘. open 토글 시 회전 애니메이션.

## SdTab — `<sd-tab>` / SdTabItem — `<sd-tab-item>`

```ts
class SdTab { value = model<any>(); }
class SdTabItem { value = input<any>(); }
```

- 탭 컨테이너 + 탭 항목. `<sd-tab-item value="a">A</sd-tab-item>` 클릭 시 `SdTab.value` 가 `"a"` 로.

## SdList — `<sd-list>` / SdListItem — `<sd-list-item>`

```ts
class SdList { inset = input(false); }
class SdListItem {
  layout = input<"accordion"|"flat">("accordion");
  open = model(false);
  selected = input(false); selectedIcon = input<string>();
  readonly = input(false);
  contentStyle = input<string>(); contentClass = input<string>();
}
```

- 세로 메뉴/리스트. `layout="accordion"` 이면 자식 리스트 펼침 가능, `flat` 이면 상시 전개.
- `selected=true` → 강조 + `selectedIcon` 표시.

## SdGap — `<sd-gap>`

```ts
height = input<"xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl">();
heightPx = input<number>();
width = input<"xxs"|...|"xxl">(); widthPx = input<number>(); widthEm = input<number>();
```

- 빈 공간 채움. 토큰 키워드(디자인 변수) 또는 px/em 직접 지정.

## SdPagination — `<sd-pagination>`

```ts
currentPage = model(0);
totalPageCount = input(0);
visiblePageCount = input(10);
```

- 페이지 번호 바. 0-based. `<sd-sheet>`/`<sd-crud-list>` 내부에서 사용되지만 단독 사용도 가능.

## 주의

- `SdCalendar` 의 자식 `<ng-template itemOf>` 의 `[itemOf]` 는 `items()` 와 같은 배열 바인딩(type token 용도).
- `SdBarcode` 는 `bypassSecurityTrustHtml` 사용. value 가 사용자 입력이라도 bwip-js 가 SVG 만 생성하므로 안전(코드 주입 불가).
