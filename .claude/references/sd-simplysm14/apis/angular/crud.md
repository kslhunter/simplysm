# @simplysm/angular — CRUD 화면 골격

목록/단건 화면의 표준 컨테이너 골격. `sd-base-container`(공통 셸) 위에 `sd-crud-list`(목록), `sd-crud-detail`(단건)이 얹힘. 표준 시그널(ready/initialized/busyCount/viewType)·page/modal/control 컨텍스트별 탑바·하단바 자동 구성·CTRL+S 저장을 내장. 사용 절차는 [client-crud.md](../manuals/client-crud.md) 참조.

## SdBaseContainer — `<sd-base-container>`

```ts
ready = model(false); initialized = input(false); busyCount = model(0);
restricted = input(false); viewType = input.required<SdViewType>(); // "page"|"modal"|"control"
viewTitle = injectViewTitleSignal(); // 자동
// 슬롯: #topbarTpl #commandTpl #contentTpl #bottomCommandTpl
```

- `initialized` — false 동안 busy 표시. `busyCount`>0 이면 busy(model 양방향, 화면이 +1/-1 누적). `restricted`=권한 없음 안내 화면 표시(콘텐츠 미렌더).
- `viewType` — `"page"`=탑바(제목+#topbarTpl) 포함, `"modal"`/`"control"`=콘텐츠만. `ready` 는 공유데이터 로드 완료 후 true(model, 화면이 이를 보고 초기화 진행).
- 직접 쓰기보다 `sd-crud-list`/`sd-crud-detail` 또는 커스텀 화면 셸로 사용. 슬롯은 `#topbarTpl`(탑바 추가), `#commandTpl`(명령영역), `#contentTpl`(본문), `#bottomCommandTpl`(하단).

## SdCrudList — `<sd-crud-list>`

```ts
ready = model(false); initialized = input(false); busyCount = model(0);
restricted = input(false); readonly = input(false); inlineEdit = input(true);
viewType = input.required<SdViewType>(); selectMode = input<"single" | "multi">();
key = input.required<string>();
items = input<TItem[]>([]); selectedKeys = model<NonNullable<TKey>[]>([]);
currDeletedItems = input<TItem[]>([]);
currentPage = model(0); totalPageCount = input(0); itemsPerPage = input(0); visiblePageCount = input(10);
sorts = model<SortingDef[]>([]);
trackByFn = input.required<(item: TItem) => TKey>();
getItemSelectableFn = input<(item: TItem) => boolean | string>();

filterSubmit = output(); submit = output(); create = output();
delete = output<TItem[]>(); restore = output<TItem[]>();
// 슬롯: #filterTpl #toolTpl #commandTpl #bottomCommandTpl, 직속 <sd-sheet-column>
```

- 목록 표준 골격(시트 + 검색폼 + 등록/삭제/복구 버튼 + CTRL+S 저장 + 모달 선택모드).
- `readonly` — 편집 전체 불가(시트 선택만). `inlineEdit`(기본 true) — true 면 시트를 `<sd-form>` 으로 감싸 셀 인라인 편집 + per-row 삭제컬럼, false 면 조회·선택 전용(편집은 외부 상세/모달). 둘은 직교.
- `selectMode` — `"single"`=행 클릭 즉시(modal 이면 close), `"multi"`=하단 확인 버튼. modal+selectMode 면 close 시 `{ selectedKeys }` 자동 전달.
- `currDeletedItems` — 현재 삭제(soft delete)된 항목들. 해당 행은 취소선 + 복구 버튼으로 표시. `key` 는 시트 설정 저장 키(`<key>-sheet`).
- 출력: `filterSubmit`(검색), `submit`(인라인 편집 저장, inlineEdit=true 일 때만), `create`(등록), `delete`/`restore`(선택 항목 배열). `<sd-sheet-column>` 을 직속에 두면 내부 시트로 투영.

```html
<sd-crud-list [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')" [readonly]="!canEdit()" [viewType]="viewType()"
  [key]="'role'" [items]="items()" [trackByFn]="trackByFn" [(selectedKeys)]="selectedKeys"
  (create)="onCreate()" (delete)="onDelete($event)" (restore)="onRestore($event)">
  <ng-template #filterTpl>...</ng-template>
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-crud-list>
```

## SdCrudDetail — `<sd-crud-detail>`

```ts
ready = model(false); initialized = input(false); busyCount = model(0);
restricted = input(false); readonly = input(false);
viewType = input.required<SdViewType>();
submit = output();
// 슬롯: #contentTpl(필수) #commandTpl #bottomCommandTpl
```

- 단건 편집 표준 골격(폼 래핑 + CTRL+S 저장 + 저장 버튼 + modal "확인" 자동).
- `readonly` — true 면 `#contentTpl` 을 `<sd-form>` 없이 그대로(읽기), false 면 폼으로 감싸 `submit` 출력. `viewType` `"page"`=상단 저장버튼, `"control"`=명령영역 저장버튼, `"modal"`=하단 우측 "확인" 자동.
- `#contentTpl`(필수) 폼 본문, `#commandTpl`/`#bottomCommandTpl` 추가 액션.

```html
<sd-crud-detail [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')" [readonly]="!canEdit()" [viewType]="viewType()"
  (submit)="onSubmit()">
  <ng-template #contentTpl><!-- 폼 본문 --></ng-template>
</sd-crud-detail>
```
