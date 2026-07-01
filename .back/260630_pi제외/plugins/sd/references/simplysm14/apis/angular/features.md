# @simplysm/angular — 테마·주소·에디터·시각화

테마 provider/selector, 주소 검색 modal, TipTap/Markdown editor, label/note/progress/calendar/barcode/ECharts 표시 컴포넌트 군이다.

## 테마

### `SdThemeProvider`

```ts
class SdThemeProvider {
  dark: WritableSignal<boolean>;
  blueprint: WritableSignal<boolean>;
  fontSizePresets: readonly number[];
  fontSize: WritableSignal<number>;
  increaseFontSize(): void;
  decreaseFontSize(): void;
}
```

- `dark` — true면 browser body class `sd-theme-dark` 를 켠다.
- `blueprint` — true면 browser body class `sd-theme-blueprint` 를 켠다.
- `fontSizePresets` — `[12, 14, 16, 20, 24, 28]` px 후보 배열.
- `fontSize` — browser documentElement `style.fontSize` 로 반영되는 px 값. 초기 12.
- `increaseFontSize` — 현재보다 큰 첫 preset으로 올린다.
- `decreaseFontSize` — 현재보다 작은 마지막 preset으로 내린다.

### `SdThemeSelector` — `<sd-theme-selector>`

```ts
class SdThemeSelector {}
```

- 동작 — dropdown 안에서 font size 증감, dark mode, blueprint switch를 `SdThemeProvider` signal에 직접 연결한다.
- disabled 조건 — font size가 preset 최솟값/최댓값이면 각각 minus/plus button을 disabled한다.

## 주소 검색

### `Address`, `SdAddressSearchModal`

```ts
interface Address {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
class SdAddressSearchModal implements SdModalContentDef<Address>, OnInit {
  close: OutputEmitterRef<Address>;
  initialized: WritableSignal<boolean>;
  errorMessage: WritableSignal<string | null>;
}
```

- `postNumber` — Daum postcode `zonecode`.
- `address` — 사용자가 도로명/지번 중 고른 주소와 도로명 부가 주소 괄호 문자열.
- `buildingName` — Daum `buildingName` 이 빈 문자열이 아니면 그 값, 빈 문자열이면 undefined.
- `close` — 주소 선택 완료 시 `Address` 를 emit한다.
- `initialized` — script load/embed 완료 또는 load error 표시 완료 뒤 true.
- `errorMessage` — postcode script load 실패 메시지. 있으면 content 대신 error div를 렌더한다.
- script 동작 — `id="daum_address"` script를 재사용하거나 생성하고 `daum.postcode.load` 뒤 embed한다.

## 에디터

### `SdTiptapEditor` — `<sd-tiptap-editor>`

```ts
class SdTiptapEditor {
  value: ModelSignal<string | undefined>;
  disabled: InputSignal<boolean>;
  readonly: InputSignal<boolean>;
  required: InputSignal<boolean>;
  placeholder: InputSignal<string | undefined>;
  validatorFn: InputSignal<((value: string | undefined) => string | undefined) | undefined>;
  extensions: InputSignal<AnyExtension[] | undefined>;
  editor: WritableSignal<Editor | undefined>;
  activeStates: WritableSignal<TiptapActiveStates>;
  activeColor: WritableSignal<string>;
  activeBgColor: WritableSignal<string>;
  colorPickerMode: WritableSignal<"text" | "bg" | undefined>;
  execCmd: (cmd: TiptapCommand) => void;
  toggleColorPicker: (mode: "text" | "bg") => void;
  applyColor: (color: string | undefined) => void;
}
```

- `value` — editor HTML. editor가 empty면 undefined로 set한다.
- `disabled` — toolbar를 숨기고 editor editable을 false로 만든다.
- `readonly` — editor editable을 false로 만들지만 toolbar는 disabled가 false면 표시된다.
- `required` — value가 nullish면 “값을 입력하세요.” validity 메시지를 만든다.
- `placeholder` — custom extensions가 없을 때 default extensions에 `Placeholder.configure({ placeholder })` 를 추가한다.
- `validatorFn` — 추가 validity 메시지를 반환하는 함수.
- `extensions` — TipTap extension 배열. 있으면 default extensions/placeholder 조합 대신 그대로 쓴다.
- `editor` — 내부 TipTap `Editor` instance signal. destroy 시 undefined로 set한다.
- `activeStates` — toolbar active 상태들.
- `activeColor` — selection text color attribute.
- `activeBgColor` — selection highlight color attribute.
- `colorPickerMode` — `"text"` 는 text color, `"bg"` 는 highlight color, undefined는 picker 닫힘.
- `execCmd` — toolbar command 실행 함수.
- `toggleColorPicker.mode` — 같은 mode면 닫고, 다르면 해당 mode로 연다.
- `applyColor.color` — text/bg mode에 따라 color set 또는 undefined면 unset 후 picker를 닫는다.
- default extensions — StarterKit, TextStyle, Color, multicolor Highlight, TextAlign heading/paragraph, base64 Image, Underline.

### `SdMarkdownEditor` — `<sd-markdown-editor>`

```ts
class SdMarkdownEditor {
  value: ModelSignal<string | undefined>;
  disabled: InputSignal<boolean>;
  readonly: InputSignal<boolean>;
  required: InputSignal<boolean>;
  placeholder: InputSignal<string | undefined>;
  validatorFn: InputSignal<((value: string | undefined) => string | undefined) | undefined>;
  editor: WritableSignal<Editor | undefined>;
  activeStates: WritableSignal<TiptapActiveStates>;
  execCmd(cmd: TiptapCommand): void;
}
```

- `value` — markdown 문자열. 빈 문자열은 undefined로 정규화한다.
- `disabled` — toolbar를 숨기고 editor editable을 false로 만든다.
- `readonly` — toolbar를 숨기고 editor editable을 false로 만든다.
- `required` — value가 nullish면 “값을 입력하세요.” validity 메시지를 만든다.
- `placeholder` — default markdown extensions에 Placeholder extension을 추가한다.
- `validatorFn` — 추가 validity 메시지를 반환하는 함수.
- `editor` — 내부 TipTap `Editor` instance signal.
- `activeStates` — toolbar active 상태들.
- `execCmd` — disabled/readonly면 무시하고, 아니면 toolbar command를 실행한다.
- default extensions — StarterKit, Markdown.

### editor command literals

- `"bold"` — bold mark toggle.
- `"italic"` — italic mark toggle.
- `"underline"` — underline mark toggle.
- `"strike"` — strike mark toggle.
- `"h1"` — heading level 1 toggle.
- `"h2"` — heading level 2 toggle.
- `"bulletList"` — bullet list toggle.
- `"orderedList"` — ordered list toggle.
- `"indent"` — list item sink.
- `"outdent"` — list item lift.
- `"blockquote"` — blockquote toggle.
- `"codeBlock"` — code block toggle.
- `"alignLeft"` — textAlign left set.
- `"alignCenter"` — textAlign center set.
- `"alignRight"` — textAlign right set.
- `"alignJustify"` — textAlign justify set.
- `"clean"` — clearNodes + unsetAllMarks.

## 표시 컴포넌트

### `SdLabel` — `<sd-label>`

```ts
class SdLabel {
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray" | undefined>;
  color: InputSignal<string | undefined>;
  clickable: InputSignal<boolean>;
}
```

- `theme` — background를 해당 theme default 색으로 지정한다.
- `color` — inline background style. theme보다 style binding이 직접 적용된다.
- `clickable` — true면 cursor pointer와 hover dark background를 적용한다.

### `SdNote` — `<sd-note>`

```ts
class SdNote {
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray" | undefined>;
  size: InputSignal<"sm" | "lg" | undefined>;
  inset: InputSignal<boolean>;
}
```

- `theme` — background/border를 해당 theme lightest 색으로 지정한다.
- `size` — `"sm"` 은 font-size sm + 작은 padding, `"lg"` 는 큰 padding.
- `inset` — true면 border-radius를 0으로 만든다.

### `SdProgress` — `<sd-progress>`

```ts
class SdProgress {
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  theme: InputSignal<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">;
  value: InputSignal<number>;
}
```

- `inset` — border/radius를 제거하고 control background를 쓴다.
- `size` — `"sm"`/`"lg"` content padding을 바꾼다.
- `theme` — progress bar background theme. required.
- `value` — percent pipe로 표시하고 bar width는 `clamp(value * 100, 0, 100)%`.

### `SdCalendar<T>` — `<sd-calendar>`

```ts
class SdCalendar<T> {
  items: InputSignal<T[]>;
  getItemDateFn: InputSignal<(item: T, index: number) => DateOnly>;
  yearMonth: InputSignal<DateOnly>;
  weekStartDay: InputSignal<number>;
  minDaysInFirstWeek: InputSignal<number>;
}
```

- `items` — 날짜별로 배치할 item 배열. required.
- `getItemDateFn` — item과 index에서 `DateOnly` 를 반환하는 required 함수.
- `yearMonth` — 달력 기준 월. 기본은 `new DateOnly().setDay(1)`.
- `weekStartDay` — 주 시작 요일 index. header와 `getWeekSeqStartDate` 에 쓰인다. 기본 0.
- `minDaysInFirstWeek` — `DateOnly.getWeekSeqStartDate` 에 전달하는 첫 주 최소 일수. 기본 1.
- `ng-template[itemOf]` — 날짜 cell 안 item 표시 template. context index는 `row * 7 + col`.

### `SdBarcode` / `BarcodeType` — `<sd-barcode>`

```ts
class SdBarcode {
  type: InputSignal<BarcodeType>;
  value: InputSignal<string | undefined>;
}
type BarcodeType = ...;
```

- `type` — `bwipjs.toSVG({ bcid: type, text: value })` 의 `bcid` 로 그대로 전달되는 required barcode type.
- `value` — barcode text. nullish/빈 문자열이면 빈 HTML을 반환한다.
- sanitizing — bwip-js가 만든 SVG 문자열을 `bypassSecurityTrustHtml` 로 신뢰 처리한다.

#### `BarcodeType` literal values

아래 각 literal은 `SdBarcode.type` 에 넣으면 같은 문자열이 bwip-js `bcid` 로 전달된다.

- `"auspost"` — bwip-js barcode type `auspost`.
- `"azteccode"` — bwip-js barcode type `azteccode`.
- `"azteccodecompact"` — bwip-js barcode type `azteccodecompact`.
- `"aztecrune"` — bwip-js barcode type `aztecrune`.
- `"bc412"` — bwip-js barcode type `bc412`.
- `"channelcode"` — bwip-js barcode type `channelcode`.
- `"codablockf"` — bwip-js barcode type `codablockf`.
- `"code11"` — bwip-js barcode type `code11`.
- `"code128"` — bwip-js barcode type `code128`.
- `"code16k"` — bwip-js barcode type `code16k`.
- `"code2of5"` — bwip-js barcode type `code2of5`.
- `"code32"` — bwip-js barcode type `code32`.
- `"code39"` — bwip-js barcode type `code39`.
- `"code39ext"` — bwip-js barcode type `code39ext`.
- `"code49"` — bwip-js barcode type `code49`.
- `"code93"` — bwip-js barcode type `code93`.
- `"code93ext"` — bwip-js barcode type `code93ext`.
- `"codeone"` — bwip-js barcode type `codeone`.
- `"coop2of5"` — bwip-js barcode type `coop2of5`.
- `"daft"` — bwip-js barcode type `daft`.
- `"databarexpanded"` — bwip-js barcode type `databarexpanded`.
- `"databarexpandedcomposite"` — bwip-js barcode type `databarexpandedcomposite`.
- `"databarexpandedstacked"` — bwip-js barcode type `databarexpandedstacked`.
- `"databarexpandedstackedcomposite"` — bwip-js barcode type `databarexpandedstackedcomposite`.
- `"databarlimited"` — bwip-js barcode type `databarlimited`.
- `"databarlimitedcomposite"` — bwip-js barcode type `databarlimitedcomposite`.
- `"databaromni"` — bwip-js barcode type `databaromni`.
- `"databaromnicomposite"` — bwip-js barcode type `databaromnicomposite`.
- `"databarstacked"` — bwip-js barcode type `databarstacked`.
- `"databarstackedcomposite"` — bwip-js barcode type `databarstackedcomposite`.
- `"databarstackedomni"` — bwip-js barcode type `databarstackedomni`.
- `"databarstackedomnicomposite"` — bwip-js barcode type `databarstackedomnicomposite`.
- `"databartruncated"` — bwip-js barcode type `databartruncated`.
- `"databartruncatedcomposite"` — bwip-js barcode type `databartruncatedcomposite`.
- `"datalogic2of5"` — bwip-js barcode type `datalogic2of5`.
- `"datamatrix"` — bwip-js barcode type `datamatrix`.
- `"datamatrixrectangular"` — bwip-js barcode type `datamatrixrectangular`.
- `"datamatrixrectangularextension"` — bwip-js barcode type `datamatrixrectangularextension`.
- `"dotcode"` — bwip-js barcode type `dotcode`.
- `"ean13"` — bwip-js barcode type `ean13`.
- `"ean13composite"` — bwip-js barcode type `ean13composite`.
- `"ean14"` — bwip-js barcode type `ean14`.
- `"ean2"` — bwip-js barcode type `ean2`.
- `"ean5"` — bwip-js barcode type `ean5`.
- `"ean8"` — bwip-js barcode type `ean8`.
- `"ean8composite"` — bwip-js barcode type `ean8composite`.
- `"flattermarken"` — bwip-js barcode type `flattermarken`.
- `"gs1-128"` — bwip-js barcode type `gs1-128`.
- `"gs1-128composite"` — bwip-js barcode type `gs1-128composite`.
- `"gs1-cc"` — bwip-js barcode type `gs1-cc`.
- `"gs1datamatrix"` — bwip-js barcode type `gs1datamatrix`.
- `"gs1datamatrixrectangular"` — bwip-js barcode type `gs1datamatrixrectangular`.
- `"gs1dldatamatrix"` — bwip-js barcode type `gs1dldatamatrix`.
- `"gs1dlqrcode"` — bwip-js barcode type `gs1dlqrcode`.
- `"gs1dotcode"` — bwip-js barcode type `gs1dotcode`.
- `"gs1northamericancoupon"` — bwip-js barcode type `gs1northamericancoupon`.
- `"gs1qrcode"` — bwip-js barcode type `gs1qrcode`.
- `"hanxin"` — bwip-js barcode type `hanxin`.
- `"hibcazteccode"` — bwip-js barcode type `hibcazteccode`.
- `"hibccodablockf"` — bwip-js barcode type `hibccodablockf`.
- `"hibccode128"` — bwip-js barcode type `hibccode128`.
- `"hibccode39"` — bwip-js barcode type `hibccode39`.
- `"hibcdatamatrix"` — bwip-js barcode type `hibcdatamatrix`.
- `"hibcdatamatrixrectangular"` — bwip-js barcode type `hibcdatamatrixrectangular`.
- `"hibcmicropdf417"` — bwip-js barcode type `hibcmicropdf417`.
- `"hibcpdf417"` — bwip-js barcode type `hibcpdf417`.
- `"hibcqrcode"` — bwip-js barcode type `hibcqrcode`.
- `"iata2of5"` — bwip-js barcode type `iata2of5`.
- `"identcode"` — bwip-js barcode type `identcode`.
- `"industrial2of5"` — bwip-js barcode type `industrial2of5`.
- `"interleaved2of5"` — bwip-js barcode type `interleaved2of5`.
- `"isbn"` — bwip-js barcode type `isbn`.
- `"ismn"` — bwip-js barcode type `ismn`.
- `"issn"` — bwip-js barcode type `issn`.
- `"itf14"` — bwip-js barcode type `itf14`.
- `"japanpost"` — bwip-js barcode type `japanpost`.
- `"kix"` — bwip-js barcode type `kix`.
- `"leitcode"` — bwip-js barcode type `leitcode`.
- `"mailmark"` — bwip-js barcode type `mailmark`.
- `"mands"` — bwip-js barcode type `mands`.
- `"matrix2of5"` — bwip-js barcode type `matrix2of5`.
- `"maxicode"` — bwip-js barcode type `maxicode`.
- `"micropdf417"` — bwip-js barcode type `micropdf417`.
- `"microqrcode"` — bwip-js barcode type `microqrcode`.
- `"msi"` — bwip-js barcode type `msi`.
- `"onecode"` — bwip-js barcode type `onecode`.
- `"pdf417"` — bwip-js barcode type `pdf417`.
- `"pdf417compact"` — bwip-js barcode type `pdf417compact`.
- `"pharmacode"` — bwip-js barcode type `pharmacode`.
- `"pharmacode2"` — bwip-js barcode type `pharmacode2`.
- `"planet"` — bwip-js barcode type `planet`.
- `"plessey"` — bwip-js barcode type `plessey`.
- `"posicode"` — bwip-js barcode type `posicode`.
- `"postnet"` — bwip-js barcode type `postnet`.
- `"pzn"` — bwip-js barcode type `pzn`.
- `"qrcode"` — bwip-js barcode type `qrcode`.
- `"rationalizedCodabar"` — bwip-js barcode type `rationalizedCodabar`.
- `"raw"` — bwip-js barcode type `raw`.
- `"rectangularmicroqrcode"` — bwip-js barcode type `rectangularmicroqrcode`.
- `"royalmail"` — bwip-js barcode type `royalmail`.
- `"sscc18"` — bwip-js barcode type `sscc18`.
- `"swissqrcode"` — bwip-js barcode type `swissqrcode`.
- `"symbol"` — bwip-js barcode type `symbol`.
- `"telepen"` — bwip-js barcode type `telepen`.
- `"telepennumeric"` — bwip-js barcode type `telepennumeric`.
- `"ultracode"` — bwip-js barcode type `ultracode`.
- `"upca"` — bwip-js barcode type `upca`.
- `"upcacomposite"` — bwip-js barcode type `upcacomposite`.
- `"upce"` — bwip-js barcode type `upce`.
- `"upcecomposite"` — bwip-js barcode type `upcecomposite`.

### `SdEcharts` — `<sd-echarts>`

```ts
class SdEcharts {
  option: InputSignal<echarts.EChartsOption>;
  notMerge: InputSignal<boolean>;
  loading: InputSignal<boolean>;
}
```

- `option` — `chart.setOption(option, { notMerge })` 에 전달할 required ECharts option.
- `notMerge` — `setOption` 의 notMerge option. 기본 false.
- `loading` — true면 `chart.showLoading()`, false면 `chart.hideLoading()`.
- resize 동작 — host resize event에서 `chart.resize()` 를 호출한다.
- renderer — `echarts.init(element, null, { renderer: "svg" })` 로 생성한다.
