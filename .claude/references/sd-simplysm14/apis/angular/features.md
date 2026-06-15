# @simplysm/angular — features(테마·주소·에디터·시각화)

테마 토글·폰트 크기, 주소 검색 모달, 리치텍스트 에디터, 라벨·노트·진행률·캘린더·바코드·차트 등 표시용 컴포넌트 모음. 특정 화면 기능을 붙일 때 개별로 읽힘.

## 테마

### `SdThemeProvider`

`@Injectable({ providedIn: "root" })`. (`provideSdAngular` 가 dark/fontSize 를 `SdLocalStorageProvider` 에 영속화)

- `dark: WritableSignal<boolean>` (초기 false) — `effect` 로 body `sd-theme-dark` 클래스 토글(브라우저 전용).
- `fontSize: WritableSignal<number>` (초기 12) — `effect` 로 `documentElement.style.fontSize` 설정.
- `fontSizePresets: readonly number[]` = `[12, 14, 16, 20, 24, 28]`.
- `increaseFontSize()` / `decreaseFontSize()` — 다음/이전 프리셋으로(경계에서 no-op).

### `SdThemeSelector` — `<sd-theme-selector>`

팔레트 아이콘 드롭다운(폰트 +/- · 다크모드 스위치). input 없음. `isMinFontSize`/`isMaxFontSize: computed` 로 +/- 버튼 비활성.

## 주소

### `SdAddressSearchModal` — `<sd-address-search-modal>`

Daum 우편번호 위젯 모달. `SdModalContentDef<Address>` 구현 — `_sdModal.showAsync({ type: SdAddressSearchModal, ... })` 로 띄움.

- input 없음. `close: output<Address>` — 선택 완료 시 주소 emit.
- `Address` = `{ postNumber: string | undefined; address: string | undefined; buildingName: string | undefined }`.

## 에디터

### `SdTiptapEditor` — `<sd-tiptap-editor>`

툴바 내장 리치텍스트(TipTap) 에디터.

- `value: model<string>` — HTML 콘텐츠(비면 `undefined`).
- `disabled: boolean` — true 면 툴바 숨김 + 비편집.
- `readonly: boolean` — 비편집(기본 커서 유지). 편집 가능 = `!disabled && !readonly`.
- `required: boolean` — 빈 값일 때 "값을 입력하세요.".
- `placeholder: string` — Placeholder 확장 추가(`extensions` 미지정 시).
- `validatorFn: (value) => string | undefined` — 커스텀 검증.
- `extensions: AnyExtension[]` — 기본 확장 셋 전체 override.
- 기본 확장: StarterKit·TextStyle·Color·Highlight·TextAlign·Image(base64)·Underline(+placeholder 시 Placeholder). 툴바: h1/h2·bold/italic/underline/strike·텍스트/배경색·리스트·들여쓰기·인용·코드블록·정렬·clean.

## 시각화

### `SdLabel` — `<sd-label>`

- `theme: "primary"|...|"blue-gray"|undefined` — 배경(`--theme-{key}-default`; 미지정 시 gray-darker).
- `color: string` — 명시 배경색(theme 보다 우선).
- `clickable: boolean` — true 면 포인터 커서 + hover 진해짐.

### `SdNote` — `<sd-note>`

- `theme: "primary"|...|"blue-gray"|undefined` — `--theme-{key}-lightest` 배경+테두리(미지정 시 gray-lightest, 테두리 없음).
- `size: "sm"|"lg"` — `"sm"` 작은 폰트/패딩, `"lg"` 큰 패딩.
- `inset: boolean` — true 면 라운드 제거(flush).

### `SdProgress` — `<sd-progress>`

- `theme: input.required<"primary"|...|"blue-gray">` — 진행 바 색(`--theme-{key}-default`).
- `value: input.required<number>` — 0~1 비율(퍼센트 표시).
- `inset: boolean` — true 면 라운드/테두리 제거. `size: "sm"|"lg"` — 패딩.

### `SdCalendar<T>` — `<sd-calendar>`

6×7 월 그리드에 일자별 항목 투영.

- `items: input.required<T[]>` — 데이터.
- `getItemDateFn: input.required<(item, index) => DateOnly>` — 항목→일자 매핑.
- `yearMonth: DateOnly` (기본 이번달 1일) — 표시 월(밖 일자는 `not-current` 클래스).
- `weekStartDay: number` (기본 0=일요일) — 첫 열 요일.
- `minDaysInFirstWeek: number` (기본 1) — 첫 주 시작 계산.
- 콘텐츠: `[itemOf]` 항목 템플릿(필수).

```html
<sd-calendar [items]="events()" [getItemDateFn]="getDate" [(yearMonth)]="month">
  <ng-template [itemOf]="events()" let-item="item">{{ item.title }}</ng-template>
</sd-calendar>
```

### `SdBarcode` — `<sd-barcode>`

bwip-js 로 바코드/QR 을 인라인 SVG 렌더.

- `type: input.required<BarcodeType>` — bwip-js `bcid`(심볼로지). `BarcodeType` 은 bwip-js 전 심볼로지 문자열 union(예 `"qrcode"`·`"code128"`·`"code39"`·`"ean13"`·`"datamatrix"`·`"pdf417"`·`"upca"` 등 ~150종).
- `value: string` — 바코드 텍스트(비면 미렌더).

### `SdEcharts` — `<sd-echarts>`

Apache ECharts(SVG) 래퍼. `SdResizeDirective` hostDirective 로 자동 리사이즈.

- `option: input.required<echarts.EChartsOption>` — 차트 옵션(반응형 `setOption`).
- `notMerge: boolean` (기본 false) — true 면 이전 옵션과 병합 없이 교체.
- `loading: boolean` (기본 false) — true 면 `showLoading()`, false 면 `hideLoading()`.
