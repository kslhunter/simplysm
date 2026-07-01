# @simplysm/angular — 테마·주소·에디터·시각화

테마 provider/selector, 주소 검색 modal, TipTap/Markdown editor, label/note/progress/calendar/barcode/ECharts 표시 컴포넌트 군이다. 컴포넌트는 standalone · OnPush · `ViewEncapsulation.None`.

`theme` literal(8색)은 컨트롤 공통값 `"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"` 로, 각 값이 `--theme-<key>-*` CSS 변수 배경/색을 결정한다.

## 테마

### `SdThemeProvider`

```ts
@Injectable({ providedIn: "root" })
class SdThemeProvider {
  dark: WritableSignal<boolean>; // default false
  blueprint: WritableSignal<boolean>; // default false
  fontSize: WritableSignal<number>; // default 12
  readonly fontSizePresets: readonly number[]; // [12, 14, 16, 20, 24, 28]
  increaseFontSize(): void;
  decreaseFontSize(): void;
}
```

테마 상태를 body class / html font-size로 반영하는 root 서비스. browser에서만 effect 동작.

- `dark` — true면 `<body>` 에 `sd-theme-dark` class. 다크 모드.
- `blueprint` — true면 `sd-theme-blueprint` class(설계도 테마, dark와 직교 조합).
- `fontSize` — `<html>` `font-size: {n}px`(기본 12).
- `increaseFontSize`/`decreaseFontSize` — `fontSizePresets`(12/14/16/20/24/28) 내 다음/이전 단계로 이동.

### `SdThemeSelector` (`sd-theme-selector`)

입력 없음. palette 아이콘 dropdown으로 글자 크기(+/- 버튼), "다크 모드"·"블루프린트" `sd-switch` 를 렌더하고 `SdThemeProvider` signal을 양방향 바인딩해 직접 토글한다.

## 주소 검색

### `SdAddressSearchModal` (`sd-address-search-modal`)

```ts
class SdAddressSearchModal implements SdModalContentDef<Address> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<Address>;
}
interface Address {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

Daum 우편번호 위젯을 임베드하는 모달 컨텐츠 컴포넌트(input 없음). 주소 선택 시 `close.emit(Address)` 로 결과 반환.

- `Address.postNumber` — 우편번호(zonecode). `address` — 도로/지번 전체 주소(부가 접미 포함). `buildingName` — 건물명(없으면 undefined).
- `initialized` — 위젯 스크립트 로드 완료 전 busy 표시.

## 에디터

### `SdTiptapEditor` (`sd-tiptap-editor`)

```ts
class SdTiptapEditor {
  value: ModelSignal<string>; // HTML 문자열
  disabled: InputSignal<boolean>; // default false
  readonly: InputSignal<boolean>; // default false
  required: InputSignal<boolean>; // default false
  placeholder: InputSignal<string | undefined>;
  validatorFn: InputSignal<(value: string | undefined) => string | undefined>;
  extensions: InputSignal<AnyExtension[] | undefined>;
}
```

TipTap 리치 텍스트 에디터. output 없음 — 상태는 `value` model로만 노출.

- `value` — HTML 문자열(양방향). 빈 에디터는 `undefined`.
- `disabled` — true면 편집 불가 + 툴바/색상 picker 숨김.
- `readonly` — true면 편집 불가(툴바는 표시). 편집 가능 = `!disabled && !readonly`.
- `required` — 빈 값이면 `"값을 입력하세요."` invalid.
- `placeholder` — 커스텀 extensions 미사용 시 placeholder extension 추가.
- `extensions` — 지정 시 기본 extension 세트 전체 교체(placeholder 무시). 기본: StarterKit, TextStyle, Color, Highlight, TextAlign, Image(inline:false·base64 허용), Underline.
- 툴바 — h1/h2, bold/italic/underline/strike, 텍스트·배경 색, 목록/들여쓰기, blockquote/codeBlock, 정렬, clean.

### `SdMarkdownEditor` (`sd-markdown-editor`)

```ts
class SdMarkdownEditor {
  value: ModelSignal<string>;                    // Markdown 문자열
  disabled, readonly, required: InputSignal<boolean>;   // default false
  placeholder: InputSignal<string | undefined>;
  validatorFn: InputSignal<(value: string | undefined) => string | undefined>;
}
```

Markdown 소스 에디터(StarterKit + `@tiptap/markdown`, `contentType: "markdown"`). output 없음.

- `value` — Markdown 문자열(양방향). 빈 값 `""` 은 `undefined` 로 정규화.
- `disabled`/`readonly` — 둘 중 하나라도 true면 툴바 숨김 + 편집 차단(tiptap은 disabled만 툴바 숨김).
- `placeholder`/`required`/`validatorFn` — tiptap과 동일. preview 토글·색상·정렬·underline 없음(tiptap의 부분집합).

## 시각화

### `SdLabel` (`sd-label`)

```ts
class SdLabel {
  theme: InputSignal<Theme8 | undefined>;
  color: InputSignal<string | undefined>;
  clickable: InputSignal<boolean>; // default false
}
```

태그/배지 라벨. `<ng-content>` 투영.

- `theme` — 8색. 배경 `--theme-<key>-default`(미지정 시 `--theme-gray-darker`), 텍스트는 항상 반전색.
- `color` — raw CSS 색을 `[style.background]` 로 덮어쓰기.
- `clickable` — true면 `cursor:pointer` + hover 시 진한 배경(`--theme-<key>-dark`).

### `SdNote` (`sd-note`)

```ts
class SdNote {
  theme: InputSignal<Theme8 | undefined>;
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>; // default false
}
```

안내 박스. `<ng-content>` 투영.

- `theme` — 8색. 배경/테두리 `--theme-<key>-lightest`(미지정 시 `--theme-gray-lightest`·테두리 없음).
- `size` — `"sm"`(작은 글씨/padding)/`"lg"`(큰 padding)/미지정 기본.
- `inset` — true면 `border-radius:0`.

### `SdProgress` (`sd-progress`)

```ts
class SdProgress {
  value: InputSignal<number>; // required, 0~1 비율
  theme: InputSignal<Theme8>; // required
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>; // default false
}
```

단일 진행 막대(`max` 입력 없음). `value` 는 0~1 비율로, `PercentPipe`("1.0-2")로 표시하고 막대 너비 = `clamp(value*100, 0, 100)%`.

- `value` — **required**. 0~1 진행 비율.
- `theme` — **required** 8색. 채워진 막대 색 `--theme-<key>-default`.
- `size` — `"sm"`/`"lg"`/미지정 padding. `inset` — true면 라운드/테두리 제거.

### `SdCalendar<T>` (`sd-calendar`)

```ts
class SdCalendar<T> {
  items: InputSignal<T[]>;                                   // required
  getItemDateFn: InputSignal<(item: T, index: number) => DateOnly>;  // required
  yearMonth: InputSignal<DateOnly>;                          // default 이번 달 1일
  weekStartDay: InputSignal<number>;                         // default 0
  minDaysInFirstWeek: InputSignal<number>;                   // default 1
  itemTplRef: ...;     // SdItemOfTemplate, required contentChild
}
```

항목을 날짜 칸에 뿌리는 월 달력(6×7 그리드). 날짜 값 model·이전/다음 버튼·output 없음(월 이동은 `yearMonth` 바인딩으로 호출측이).

- `items` — **required** 임의 항목 배열.
- `getItemDateFn` — **required**. 항목 → `DateOnly`(날짜 칸 버킷팅).
- `yearMonth` — 표시 월(기본 이번 달 1일).
- `weekStartDay` — 주 시작 요일(0=일, 기본). `minDaysInFirstWeek` — 첫 주 최소 일수(기본 1).
- `itemTplRef` — **required** 항목 템플릿(`*sdItemOf` 스타일, context `{ item, index, depth }`).

### `SdBarcode` (`sd-barcode`)

```ts
class SdBarcode {
  type: InputSignal<BarcodeType>; // required
  value: InputSignal<string | undefined>;
}
```

bwip-js로 바코드/QR을 SVG 렌더(`bcid`=type, `text`=value). `value` 가 비면 빈 출력. width/height 등 별도 옵션 입력 없음(bwip-js 기본 크기).

- `type` — **required** `BarcodeType`. bwip-js `bcid` 로 매핑. QR류는 `qrcode`/`microqrcode`/`gs1qrcode`/`swissqrcode` 등.
- `value` — 인코딩할 문자열.
- `BarcodeType` — bwip-js 전체 심볼로지 union(예: `code128`, `code39`, `code93`, `ean13`/`ean8`, `upca`/`upce`, `qrcode`, `microqrcode`, `datamatrix`, `pdf417`, `azteccode`, `maxicode`, `itf14`, `gs1-128`, `gs1datamatrix`, `gs1qrcode`, `pharmacode`, `postnet`, `royalmail`, `isbn` 등 100여 종).

### `SdEcharts` (`sd-echarts`)

```ts
class SdEcharts {
  option: InputSignal<echarts.EChartsOption>; // required
  notMerge: InputSignal<boolean>; // default false
  loading: InputSignal<boolean>; // default false
}
```

ECharts 차트(SVG 렌더). host `SdResizeDirective` 로 크기 변경 시 자동 `chart.resize()`.

- `option` — **required**. ECharts 옵션. 변경 시 `setOption(option, { notMerge })`.
- `notMerge` — true면 기존 옵션과 병합하지 않고 교체.
- `loading` — true면 `chart.showLoading()`, false면 `hideLoading()`.
