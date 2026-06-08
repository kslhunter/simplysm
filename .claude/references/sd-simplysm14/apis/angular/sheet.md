# @simplysm/angular — 시트(sd-sheet)

다건 목록·편집 표(그리드). 컬럼 디렉티브 + 셀 템플릿으로 구성하며, 선택·정렬·페이지·트리펼침·셀 편집·컬럼 고정/리사이즈/설정저장을 내장. `sd-crud-list` 는 이 시트를 감싼 표준 골격([crud.md](./crud.md)). 셀은 항상 `<ng-template [cell]="items()" let-item="item">` 안에 렌더.

## SdSheet — `<sd-sheet>`

```ts
key = input<string>(); items = input<TItem[]>([]);
trackByFn = input<(item: TItem, index: number) => unknown>((item) => item);
selectMode = input<"single" | "multi">();
autoSelect = input<"click" | "focus">();
getItemSelectableFn = input<(item: TItem) => boolean | string>();
getChildrenFn = input<(item: TItem, index: number) => TItem[] | undefined>();
useAutoSort = input(false);
visiblePageCount = input(10); totalPageCount = input(0); itemsPerPage = input(0);
focusMode = input<"row" | "cell">("cell");
inset = input(false); contentStyle = input<string>(); hideConfigBar = input(false);
getItemCellClassFn = input<(item, colKey) => string>();
getItemCellStyleFn = input<(item, colKey) => string | undefined>();

// outputs
itemKeydown = output<SdSheetItemKeydownEventParam<TItem>>();   // { item, event }
cellKeydown = output<SdSheetCellKeydownEventParam<TItem>>();   // { item, key, event }
// models
selectedKeys = model<unknown[]>([]); expandedItems = model<TItem[]>([]);
sorts = model<SortingDef[]>([]); currentPage = model(0);
columnControlsInput = input<readonly SdSheetColumn[]>([]); // 외부에서 컬럼 주입(crud 가 사용)
```

- `key` — 지정 시 사용자 컬럼 설정(폭/고정/숨김/순서)을 `injectSdSystemConfigResource` 로 영속(설정 버튼·설정 모달 노출). 미지정이면 설정 저장 없음.
- `trackByFn` — 행 키 함수. `selectedKeys` 가 이 키 기준으로 동작. 서버 키가 있으면 그 키 반환.
- `selectMode` — `"single"`=단일(좌측 화살표), `"multi"`=다중(좌측 체크박스+전체선택). undefined=선택 비활성. `autoSelect` `"click"`=행/셀 클릭 시 선택, `"focus"`=셀 포커스만으로 선택(키보드 위주).
- `getItemSelectableFn` — 행별 선택 가능. `true`=가능, `false`=불가, `string`=불가+사유(툴팁). 본인 계정 삭제 차단 등.
- `getChildrenFn` — 자식 반환(트리). 지정 시 펼침 컬럼·들여쓰기 표시, `expandedItems` 로 펼친 항목 관리.
- `useAutoSort` — true 면 `sorts` 변경 시 시트가 직접 `items` 클라이언트 정렬. 서버측 정렬/페이징이면 false 로 두고 외부에서 재조회. `itemsPerPage>0`+`useAutoSort` 면 클라이언트 페이징, `totalPageCount>0` 이면 서버 페이징.
- `focusMode` — `"cell"`=셀 단위 포커스 이동(편집·복사), `"row"`=행 단위(셀 인디케이터 숨김). `hideConfigBar`=상단 설정/페이징 바 숨김, `inset`=테두리 제거.
- `getItemCellClassFn`/`getItemCellStyleFn` — 행+컬럼키별 클래스/스타일(예: 삭제행 취소선). `columnControlsInput` 은 래퍼(crud)가 자식 컬럼을 시트로 위임 투영할 때 사용.

```html
<sd-sheet [items]="items()" [trackByFn]="trackByFn" [(selectedKeys)]="selectedKeys"
          [selectMode]="'multi'" [(sorts)]="sorts" [key]="'order-list'">
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## SdSheetColumn — `<sd-sheet-column>`

```ts
key = input.required<string>();
header = input<string | string[]>(""); // string[] = 다단 헤더(병합)
headerStyle; tooltip; width = input<string>();
fixed = input(false); hidden = input(false); collapse = input(false);
disableSorting = input(false); disableResizing = input(false); ordering = input(0);
cellTplRef = contentChild.required(SdSheetColumnCellTemplate);  // [cell] 템플릿(필수)
headerTplRef = contentChild<TemplateRef<void>>("headerTpl");
summaryTplRef = contentChild<TemplateRef<void>>("summaryTpl");
```

- `key` — 컬럼 식별자(정렬/설정/cellKeydown 키). `header` 배열이면 다단 헤더로 병합 표시.
- `width` — CSS 폭(예: `"120px"`). `fixed`=좌측 고정, `hidden`=숨김, `collapse`=설정상 접힘 후보. `disableSorting`/`disableResizing`=정렬/폭조정 비활성, `ordering`=기본 정렬 순서.
- `#headerTpl`/`#summaryTpl` 로 헤더/요약행 커스터마이즈. 셀 본문은 `<ng-template [cell]="items()">`(필수).

```ts
// SdSheetCellContext<T> = { $implicit: T; item: T; index: number; depth: number; edit: boolean }
```

- 셀 템플릿 컨텍스트: `item`/`index`/`depth`(트리 깊이)/`edit`(현재 셀 편집모드 여부).

## SdSheetColumnCellTemplate — `ng-template[cell]`

```ts
cell = input.required<T[]>(); // 타입 추론용 — items() 를 그대로 전달
```

- 셀 본문 템플릿 마커. `[cell]="items()"` 로 항목 배열을 넘겨 `let-item` 타입을 추론. 값 자체는 추론에만 쓰임.

## SdSheetConfigModal — `<sd-sheet-config-modal>`

```ts
sheetKey = input.required<string>();
controls = input.required<readonly SdSheetColumn[]>();
config = input.required<SdSheetConfig | undefined>();
close = output<SdSheetConfig | undefined>(); // SdModalContentDef
```

- 컬럼 고정/순서/폭/숨김을 편집하는 설정 모달. `sd-sheet` 가 설정 버튼 클릭 시 자동으로 띄우며 결과를 `key` 설정으로 저장. 직접 호출할 일은 거의 없음.

## 관련 타입

```ts
SdSheetColumnDef { key; header: string|string[]; headerStyle?; tooltip?; width?; fixed; hidden; collapse; disableSorting; disableResizing; ordering }
SdSheetHeaderDef { text; colspan; rowspan; isLastRow; fixed; colDef?; colIndex }
SdSheetConfig { columnRecord: Record<string, { width?; hidden?; fixed?; ordering? }> }
SdSheetItemKeydownEventParam<T> { item: T; event: KeyboardEvent }
SdSheetCellKeydownEventParam<T> { item: T; key: string; event: KeyboardEvent }
```

- `SdSheetColumnDef`/`SdSheetHeaderDef` — 레이아웃 엔진이 산출하는 컬럼/헤더셀 메타(내부 타입). `SdSheetConfig` — 영속 컬럼 설정. `SdSheet*KeydownEventParam` — `itemKeydown`/`cellKeydown` 출력 페이로드(행 단축키·셀 단축키 처리용).
