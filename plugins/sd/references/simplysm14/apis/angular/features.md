# @simplysm/angular — 테마, 주소, 에디터, 시각화

테마 provider/selector, 주소 검색 modal, TipTap/Markdown editor, label/note/progress/calendar/barcode/ECharts 표시 컴포넌트 군임.
컴포넌트는 standalone, OnPush, `ViewEncapsulation.None`.

`theme` literal(8색)은 컨트롤 공통값 `"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"` 로,
각 값이 `--sd-bg-<key>-solid`, `--sd-tx-<key>` 등 `--sd-*` 역할 토큰(아래 "스타일 토큰, 테마" 절)을 선택함.

## 테마

### `SdThemeProvider`

```ts
// 내장 테마 단일 정의 — union·selector·body 클래스 토글의 단일 출처(SD_THEMES)
const SD_THEMES: readonly { value: SdThemeName; label: string }[]; // light·blueprint·ide-dark
type SdThemeName = "light" | "blueprint" | "ide-dark"; // SD_THEMES 에서 파생
type SdDensity = "normal" | "compact";

@Injectable({ providedIn: "root" })
class SdThemeProvider {
  readonly themes: readonly { value: SdThemeName; label: string }[]; // = SD_THEMES
  theme: WritableSignal<SdThemeName>; // default "light"
  density: WritableSignal<SdDensity>; // default "normal"
  fontSize: WritableSignal<number>; // default 12
  readonly fontSizePresets: readonly number[]; // [12, 14, 16, 20, 24, 28]
  increaseFontSize(): void;
  decreaseFontSize(): void;
}
```

테마, 밀도, 글자크기 상태를 body class / html font-size로 반영하는 root 서비스.
browser에서만 effect 동작.

- `theme` — 내장 테마 선택.
  - `<body>` 에 선택 테마만 `sd-theme-{value}` class 토글(`light` 는 `:root` 기본값이라 클래스가 붙어도 무효).
  - 새 테마 추가 = `SD_THEMES` 항목 1줄 + `scss/themes` 값 맵 + `_theme-variables` 의 `.sd-theme-{value}` 블록.
- `density` — `"compact"` 면 `<body>` 에 `sd-density-compact` class.
  - 치수 토큰 그룹(간격, 행높이, 시트 패딩 등)만 축소하며 테마와 직교(DEC-007) — 어느 테마에서든 조합 가능.
- `fontSize` — `<html>` `font-size: {n}px`(기본 12).
- `increaseFontSize`/`decreaseFontSize` — `fontSizePresets`(12/14/16/20/24/28) 내 다음/이전 단계로 이동.
- 영속화
  - `provideSdAngular` 가 localStorage `sd-theme`/`sd-theme-density`/`sd-theme-font-size` 로 복원, 저장.
  - 저장값이 `SD_THEMES` 에 없으면(구버전 제거 등) 경고 로그 후 기본 테마 유지(silent skip 아님).

### `SdThemeSelector` (`sd-theme-selector`)

입력 없음.
palette 아이콘 dropdown으로 글자 크기(+/- 버튼), 테마 버튼 목록(`SD_THEMES` 렌더 — 선택 테마는 `primary`, 나머지는 `link-gray`),
`compact` `sd-switch` 를 렌더하고 `SdThemeProvider` signal을 직접 조작함.

### 스타일 토큰, 테마

전 컴포넌트 스타일이 `--sd-*` 역할 토큰만 소비함(팔레트, 명도 스케일 직접 소비 없음).
테마는 이 역할 토큰의 **값 맵만으로** 완성됨 — 컴포넌트 셀렉터 오버라이드 없음.

- **어휘 규약(DEC-013)**
  - 색 토큰은 `--sd-{bg|tx|bd}-…` 속성 우선.
  - 유틸 클래스명 = 토큰명에서 `--sd-` 만 뗀 것(`--sd-bg-primary-solid` ↔ `.bg-primary-solid`).
  - hover 변형은 `-hover` 접미(유틸 클래스는 미생성).
- **역할군**:
  - 배경
    - `--sd-bg-{canvas,canvas-image,control,elevated,overlay,sheet,sheet-image,inverse,field,track}`
    - 상태 `--sd-bg-state-{hover,active,selected}`
    - `--sd-bg-{disabled,busy-overlay,busy-indicator,backdrop}`
  - 텍스트 — 무채 `--sd-tx-{strong,default,muted,faint}`, `--sd-tx-{disabled,on-inverse,on-inverse-muted,on-inverse-disabled}`.
  - 보더 — 무채 `--sd-bd-{hairline,soft,default,strong,emphasis}`, `--sd-bd-{field,disabled}`.
  - 시맨틱 슬롯(키: `gray`, `blue-gray`, `primary`, `secondary`, `info`, `success`, `warning`, `danger`)
    - `--sd-bg-{key}-{solid,subtle}`(+`-hover`)
    - `--sd-tx-{key}`(+`-hover`), `--sd-tx-{key}-{solid,subtle}`
    - `--sd-bd-{key}-{solid,subtle}`(+solid `-hover`)
  - 포커스, 스크롤바 — `--sd-focus-ring-{color,width,offset}`(`:focus-visible` 규약), `--sd-scrollbar-{thumb,thumb-hover,track}`.
  - 컴포넌트 장식 — 카드, 모달, 드롭다운, 시트, 권한표 등 값 맵으로 안 잡히던 지점의 소비 토큰
    - 값: `--sd-card-*`, `--sd-modal-*`, `--sd-dropdown-bd`, `--sd-sheet-shadow`, `--sd-permission-group-*`
  - 비색상
    - 팔레트 `--sd-color-{hue}-{50..950}`, `--sd-shadow-*`, `--sd-z-*`
    - 타이포(`--sd-font-*`, `--sd-radius-*`)
    - 밀도 그룹(`--sd-gap-*`, `--sd-line-height`, `--sd-sheet-{pv,ph}`, `--sd-topbar-height`, `--sd-sidebar-width`)
- **그룹 소유권**
  - 테마 맵 = 색, 폰트, 형태(radius, 그림자, 표면 패턴)
  - 밀도 그룹 = 간격, 행높이, 시트 패딩, topbar 높이(`sd-density-compact` 가 밀도 그룹만 덮음)
- **소비 규약**
  - 컴포넌트는 `background` 단축 금지(`background-color:` 사용 — `--sd-bg-canvas-image` 패턴 보존).
  - 컴포넌트 config 의 인라인 var 지정 금지.
- **색 원천, 체이닝**
  - 테마 값은 팔레트(`--sd-color-*`) + 흰/검 알파만(커스텀 rgb 리터럴 금지).
  - `:root` 발행 토큰의 `var()` 참조는 팔레트(테마 불변)만 허용 — 테마, 밀도가 덮는 토큰끼리 체인 금지(재정의 스코프에서 하위가 안 따라옴).
- 전체 토큰 표, 라이트 기본값은 패키지의 `scss/sd-tokens.md` 카탈로그가 정본.

#### 테마 커스터마이즈 / 추가

- **앱 단위 커스터마이즈**: 내장 테마를 선택한 뒤 앱 style 파일에서 해당 `--sd-*` 역할 토큰을 재정의함(외부 주입 API 없음 — DEC-003).
  - 예: `body { --sd-bg-canvas: var(--sd-color-blue-50); }`
- **라이브러리 테마 추가**
  - ① `SD_THEMES` 에 `{ value, label }` 1줄 추가
  - ② `scss/themes/_variables-{value}.scss` 에 라이트 기본값과 다른 `--sd-*` 값만 기술(값 맵)
  - ③ `_theme-variables.scss` 에 `.sd-theme-{value}` writeVars 블록 추가
  - 컴포넌트 스타일 파일은 건드리지 않음.
- **대비 검증**: `getWcagContrastRatio` 를 패키지에서 export — 테마 핵심 fg/bg 쌍 대비를 unit 으로 검산(본문 4.5:1, 보조/UI 3:1).

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

- `Address.postNumber` — 우편번호(zonecode).
- `address` — 도로/지번 전체 주소(부가 접미 포함).
- `buildingName` — 건물명(없으면 undefined).
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
- `extensions` — 지정 시 기본 extension 세트 전체 교체(placeholder 무시).
  - 기본: StarterKit, TextStyle, Color, Highlight, TextAlign, Image(inline:false, base64 허용), Underline.
- 툴바 — h1/h2, bold/italic/underline/strike, 텍스트, 배경 색, 목록/들여쓰기, blockquote/codeBlock, 정렬, clean.

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
- `placeholder`/`required`/`validatorFn` — tiptap과 동일. preview 토글, 색상, 정렬, underline 없음(tiptap의 부분집합).

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

- `theme` — 8색. 배경 `--sd-bg-<key>-solid`(미지정 시 `--sd-bg-gray-solid`), 텍스트 `--sd-tx-<key>-solid`(solid 면 위 텍스트).
- `color` — raw CSS 색을 `[style.background-color]` 로 덮어쓰기.
- `clickable` — true면 `cursor:pointer` + hover 시 진한 배경(`--sd-bg-<key>-solid-hover`).

### `SdNote` (`sd-note`)

```ts
class SdNote {
  theme: InputSignal<Theme8 | undefined>;
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>; // default false
}
```

안내 박스. `<ng-content>` 투영.

- `theme` — 8색. 배경 `--sd-bg-<key>-subtle`, 테두리 동일 톤(미지정 시 `--sd-bg-gray-subtle`, 테두리 없음).
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

단일 진행 막대(`max` 입력 없음). `value` 는 0-1 비율로, `PercentPipe`("1.0-2")로 표시하고 막대 너비 = `clamp(value*100, 0, 100)%`.

- `value` — **required**. 0-1 진행 비율.
- `theme` — **required** 8색. 채워진 막대 색 `--sd-bg-<key>-solid`.
- `size` — `"sm"`/`"lg"`/미지정 padding.
- `inset` — true면 라운드/테두리 제거.

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

항목을 날짜 칸에 뿌리는 월 달력(6×7 그리드).
날짜 값 model, 이전/다음 버튼, output 없음(월 이동은 `yearMonth` 바인딩으로 호출측이).

- `items` — **required** 임의 항목 배열.
- `getItemDateFn` — **required**. 항목 → `DateOnly`(날짜 칸 버킷팅).
- `yearMonth` — 표시 월(기본 이번 달 1일).
- `weekStartDay` — 주 시작 요일(0=일, 기본).
- `minDaysInFirstWeek` — 첫 주 최소 일수(기본 1).
- `itemTplRef` — **required** 항목 템플릿(`*sdItemOf` 스타일, context `{ item, index, depth }`).

### `SdBarcode` (`sd-barcode`)

```ts
class SdBarcode {
  type: InputSignal<BarcodeType>; // required
  value: InputSignal<string | undefined>;
}
```

bwip-js로 바코드/QR을 SVG 렌더(`bcid`=type, `text`=value).
width/height 등 별도 옵션 입력 없음(bwip-js 기본 크기).

- `type` — **required** `BarcodeType`. bwip-js `bcid` 로 매핑. QR류는 `qrcode`/`microqrcode`/`gs1qrcode`/`swissqrcode` 등.
- `value` — 인코딩할 문자열. 비면 빈 출력.
- `BarcodeType` — bwip-js 전체 심볼로지 union(100여 종).
  - 예: `code128`, `code39`, `code93`, `ean13`/`ean8`, `upca`/`upce`, `qrcode`, `microqrcode`, `datamatrix`, `pdf417`,
    `azteccode`, `maxicode`, `itf14`, `gs1-128`, `gs1datamatrix`, `gs1qrcode`, `pharmacode`, `postnet`, `royalmail`, `isbn` 등.

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
