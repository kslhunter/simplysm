# @simplysm/angular — 부가 기능(권한표·상태프리셋·테마·주소·에디터·시각화)

위 군에 들지 않는 도메인성/표시용 컴포넌트 모음. 특정 화면 기능을 붙일 때 개별로 읽힘. 모두 standalone `sd-*` 컴포넌트.

## SdPermissionTable — `<sd-permission-table>`

```ts
value = model<Record<string, boolean>>({}); // "<코드>.use"/"<코드>.edit" → boolean
items = input<SdPermission<TModule>[]>([]);
disabled = input(false);
```

- 권한 트리 편집표. `items`(`SdPermission` 트리, routing-appstructure.md)를 사용/편집 체크박스 표로 렌더. `value` 는 `<코드>.use`/`<코드>.edit` 키의 boolean 맵(양방향).
- use 미체크면 edit 불가, use 해제 시 edit 자동 해제, 부모 토글 시 하위 일괄 변경. `disabled`=전체 읽기전용. 권한 관리 화면에 사용.

## SdStatePreset — `<sd-state-preset>`

```ts
key = input.required<string>(); state = model.required<TState>(); size = input<"sm"|"lg">();
// SdStatePresetDef<TState> { name: string; state: TState }
```

- 현재 화면 상태(`state`)를 이름붙여 저장·복원하는 프리셋 바(검색 조건 즐겨찾기 등). 별 버튼=현재 상태 저장(이름 prompt), 프리셋 클릭=상태 적용, 저장/삭제 버튼 제공.
- `key` 로 `injectSdSystemConfigResource` 에 영속. `state` 는 화면이 들고 있는 상태 시그널(양방향).

## SdThemeProvider 셀렉터

### SdThemeSelector — `<sd-theme-selector>`

```ts
// 입력 없음. SdThemeProvider 를 inject.
```

- 다크모드 토글 + 글자크기 증감 UI 드롭다운. `SdThemeProvider` 를 직접 조작(`fontSize`/`dark`). 탑바 등에 배치. provider 본체는 [README.md](./README.md) "테마·배경".

## SdAddressSearchModal — `<sd-address-search-modal>`

```ts
close = output<Address>(); // SdModalContentDef<Address>
// Address { postNumber: string | undefined; address: string | undefined; buildingName: string | undefined }
```

- 다음(Daum) 우편번호 검색 모달. `SdModalProvider.showAsync({ type: SdAddressSearchModal, inputs: {} })` 로 띄움. 스크립트를 동적 로드하며 실패 시 에러 메시지 표시. 선택 시 `{ postNumber, address, buildingName }` 으로 close.

```ts
const addr = await this._sdModal.showAsync({ title: "주소 검색", type: SdAddressSearchModal, inputs: {} });
```

## SdTiptapEditor — `<sd-tiptap-editor>`

```ts
value = model<string>(); // HTML
disabled; readonly; required; placeholder = input<string>();
validatorFn = input<(value: string | undefined) => string | undefined>();
extensions = input<AnyExtension[]>();
editor: WritableSignal<Editor | undefined>; // @internal — TipTap 인스턴스
```

- 리치 텍스트(WYSIWYG) 에디터. `value` 는 HTML 문자열(빈 내용이면 undefined, 결측 보존). 내장 툴바(제목·굵게·색·정렬·목록·인용·코드블록 등) 제공.
- `extensions` 지정 시 기본 확장 대체, 미지정 시 StarterKit + 색/하이라이트/정렬/이미지/밑줄(+placeholder). `disabled`/`readonly`=편집 불가, `required`/`validatorFn`=form 검증(`setupInvalid`).

## 시각화

### SdLabel — `<sd-label>`

```ts
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray">();
color = input<string>(); clickable = input(false);
```

- 짧은 배지/태그. `theme` 또는 임의 `color`(배경) 지정. `clickable`=호버 강조 + 커서 포인터. 상태 표시에 사용.

### SdNote — `<sd-note>`

```ts
theme = input<...8색>(); size = input<"sm"|"lg">(); inset = input(false);
```

- 안내 박스(callout). `theme` 의 옅은 배경. `inset`=라운드 제거(영역 내장). 주의/도움말 문구에 사용.

### SdProgress — `<sd-progress>`

```ts
theme = input.required<...8색>(); value = input.required<number>(); // 0~1
inset; size = input<"sm"|"lg">();
```

- 진행률 막대. `value`(0~1)를 퍼센트 텍스트 + 채움 막대로 표시(0~100% clamp). `theme` 필수.

### SdCalendar — `<sd-calendar>`

```ts
items = input.required<T[]>(); getItemDateFn = input.required<(item: T, index: number) => DateOnly>();
yearMonth = input(new DateOnly().setDay(1));
weekStartDay = input(0); minDaysInFirstWeek = input(1);
itemTplRef = contentChild.required(SdItemOfTemplate); // [itemOf] 셀 항목 템플릿(필수)
```

- 월간 캘린더. `getItemDateFn` 으로 각 항목의 날짜를 산출해 해당 칸에 `[itemOf]` 템플릿으로 렌더. `yearMonth`=표시 월, `weekStartDay`=주 시작 요일(0=일), `minDaysInFirstWeek`=첫 주 판정.

```html
<sd-calendar [items]="schedules()" [getItemDateFn]="getDate" [yearMonth]="month()">
  <ng-template [itemOf]="schedules()" let-item="item">{{ item.title }}</ng-template>
</sd-calendar>
```

### SdBarcode — `<sd-barcode>`

```ts
type = input.required<BarcodeType>(); value = input<string>();
// BarcodeType: "qrcode"|"code128"|"ean13"|"datamatrix"|... (bwip-js 전체 심볼 유니온)
```

- 바코드/QR 렌더(bwip-js SVG). `type`=심볼 종류, `value`=인코딩 문자열(빈 값이면 미표시). `BarcodeType` 는 bwip-js 가 지원하는 전체 바코드 유형 리터럴 유니온.

### SdEcharts — `<sd-echarts>`

```ts
option = input.required<echarts.EChartsOption>(); notMerge = input(false); loading = input(false);
```

- ECharts 차트. `option` 변경 시 `setOption` 적용(`notMerge`=true 면 기존 옵션 병합 안 함). `loading`=로딩 인디케이터. 호스트 리사이즈 시 자동 `resize`(svg 렌더).
