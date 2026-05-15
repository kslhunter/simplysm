# 클라이언트 화면 작성 매뉴얼

## 파일명·역할·위치

화면 파일은 `<domain>.<역할>.ts` 형식, 역할 접미사로 책임을 표시한다.

| 파일명 형식                  | 역할                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `<domain>.view.ts`           | list/detail 로 깔끔히 나뉘지 않는 화면. (예시: list/detail 의 orchestrator) |
| `<domain>.list.ts`           | 목록. `sd-crud-list` 사용.                                                |
| `<domain>.detail.ts`         | 단건 보기/편집. `sd-crud-detail` 사용.                                    |
| `<domain>.modal.ts`          | 모달 전용 화면.                                                           |
| `<domain>.print-template.ts` | 프린트 템플릿. `SdPrintProvider.printAsync` 호출 대상.                    |
| `<domain>.types.ts`          | 도메인 화면들이 공유하는 타입 정의.                                       |
| `<domain>.ts`                | 컨트롤(접미사 없음). 여러 화면에서 재사용되는 단위.                       |

- 모든 파일명은 dash-case.
- 라이브러리(`@simplysm/angular`)는 `sd-` prefix 가 붙음 (`sd-button.ts`, `sd-crud-list.ts`).

**위치**: 도메인이 있는 파일은 도메인 폴더 안에 둔다. 도메인이 없는(범용) 파일은 `src/<역할>s/` 하위에 둔다. 예: `src/controls/`, `src/modals/`.

**변형 파일**: 한 도메인 폴더 안에 같은 역할 파일이 2개 이상이면 `<domain>-<갈래>.<역할>.ts` 형식으로 prefix 를 붙여 갈래를 둔다. 예 (`outbound-instruction/` 폴더):

- `outbound-instruction.list.ts` (헤더 목록)
- `outbound-instruction-item.list.ts` (품목 목록)
- `outbound-instruction-box.list.ts` (박스 목록)
- `outbound-instruction.detail.ts`
- `outbound-instruction-header.detail.ts`

## 컴포넌트 데코레이터 기본값

Angular 기본과 다른 부분만 명시:

```ts
@Component({
  selector: "app-<dashed-name>",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `...`,
  styles: [/* language=SCSS */ `...`],  // 선택
})
```

- **`changeDetection: OnPush`** — 항상.
- **`encapsulation: ViewEncapsulation.None`** — 항상. 글로벌 SCSS 와 일관된 스타일을 쓰기 위해.
- **`standalone: true`** — 항상. NgModule 신규 도입 금지.
- **`selector` prefix** — 앱 컴포넌트는 `app-`, 라이브러리(`@simplysm/angular`)는 `sd-`.
- **`template`** 은 인라인 (`*.html` 파일 분리 없음).

**`styles`** (선택) — 다음 두 가지만 simplysm 약속:

- 첫 줄에 `/* language=SCSS */` 주석을 둬 IDE 가 SCSS 로 인식하게 한다.
- 내부 전용 클래스는 `_` prefix (예: `._content`, `._button`).

## 화면 합성 패턴

화면은 list / detail / view 단위로 책임을 분리해 합성한다.

- **`*.list.ts`** — 자기 검색·페이지·정렬·재조회를 자체 책임. 외부에 `selectMode` 같은 입력을 받아 부모가 선택 동작을 제어.
- **`*.detail.ts`** — 식별자(`input.required`)를 받아 자체 로드/저장. 변경·삭제 후 `submitted` output 으로 부모에게 알림.
- **`*.view.ts`** — list/detail 합성 + 자식 간 트리거 중계. 데이터 페치는 view 가 하지 않는다.

화면이 list 또는 detail 하나로 끝나면 view 를 만들지 않고 list/detail 자체가 라우팅 진입 단위가 된다.

### list + detail 합성

view 의 합성 패턴 (예: `outbound-instruction.view.ts`):

```html
<sd-base-container [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount" ...>
  <ng-template #contentTpl>
    <div class="flex-row fill">
      <app-outbound-instruction-list #headerSheet selectMode="single" class="flex-min" />

      @let _selectedId = headerSheet.selectedKeys().first(); @if (_selectedId == null) {
      <div class="flex-fill p-default">선택하세요.</div>
      } @else {
      <app-outbound-instruction-detail
        class="flex-fill"
        [instructionId]="_selectedId"
        (submitted)="headerSheet.doRefresh()"
      />
      }
    </div>
  </ng-template>
</sd-base-container>
```

핵심 약속:

- view 는 list 컴포넌트를 템플릿 변수(`#headerSheet`)로 잡아 `selectedKeys()` 를 읽고 `doRefresh()` 를 호출한다.
- detail 의 단건 변경·삭제는 list 가 표시하는 같은 데이터에 반영돼야 하므로, detail 의 `submitted` → list 의 `doRefresh()` 호출로 동기화한다.
- view 는 `sd-base-container` 를 루트로 두고, 내부 컨텐츠는 `#contentTpl` 슬롯에 둔다.

### list + list 합성 (마스터-라인)

좌 list 가 마스터(헤더), 우 list 가 디테일(라인) 역할로 합성:

```html
<sd-base-container [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount" ...>
  <ng-template #contentTpl>
    <div class="flex-row fill">
      <app-master-list #headerSheet selectMode="single" class="flex-min" />

      @let _selectedId = headerSheet.selectedKeys().first();
      @if (_selectedId == null) {
        <div class="flex-fill p-default">선택하세요.</div>
      } @else {
        <app-line-list
          class="flex-fill"
          [headerId]="_selectedId"
          (submitted)="headerSheet.doRefresh()"
        />
      }
    </div>
  </ng-template>
</sd-base-container>
```

핵심 약속:

- 우 list 는 좌의 선택 키를 `input` 으로 받아 자동 재조회. (외부 input → filter 머지 패턴은 §"외부 input 을 filter 에 반영" 참조.)
- 우 list 의 저장·삭제 후 좌 헤더 목록까지 갱신해야 하면 우 list 가 `submitted` output 을 emit, view 가 받아 `#headerSheet.doRefresh()` 호출.
- 우 list 안에 추가 분기(탭 등)는 [client-tab.md](./client-tab.md) 매뉴얼 채택.

## 화면 컴포넌트의 표준 시그널

화면 컴포넌트(view/list/detail/modal) 가 공통으로 쓰는 시그널 4종. **필요한 것만 채택**하되, 채택할 때는 아래 약속된 이름·의미·전파를 그대로 따른다.

| 이름          | 종류                     | 의미                                                                                                                                  |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`       | `signal(false)`          | 컴포넌트가 데이터 로드를 시작해도 되는 시점. 부모/컨테이너가 true 로 만들면 자식이 effect 발화.                                       |
| `initialized` | `signal(false)`          | 첫 데이터 로드까지 끝났는지. 자식이 자기 로드 끝낸 뒤 set true.                                                                       |
| `busyCount`   | `signal(0)`              | 진행 중인 비동기 작업 수. 시작 시 `+1`, 끝나면 `-1`. > 0 이면 화면이 busy 표시.                                                       |
| `viewType`    | `injectViewTypeSignal()` | 화면이 page / control / modal 어느 컨텍스트에서 동작 중인지. 라우팅 진입이면 `'page'`, view 자식이면 `'control'`, 모달이면 `'modal'`. |

**전파**: 부모가 자식에게 위 시그널들을 그대로 흘려보낸다. `sd-base-container` / `sd-crud-list` / `sd-crud-detail` 가 이들을 입력으로 받는 표준.

**`busyCount` 사용 패턴**:

```ts
this.busyCount.update((v) => v + 1);
await this._sdToast.try(async () => {
  // ...작업...
});
this.busyCount.update((v) => v - 1);
```

## 권한 (perms)

화면 컴포넌트는 권한을 `injectPermsSignal(<paths>, <actions>)` 로 받는다.

```ts
perms = injectPermsSignal(
  ["inventory.outbound-instruction"],
  ["use", "edit", "write-and-document.edit"],
);
```

- 첫 인자: **권한 path 목록** (도메인 트리 좌표).
- 둘째 인자: **확인할 action 목록**. `perms()` 는 사용자가 가진 action 들의 string 배열.

**사용 약속**:

- 단순한 권한 체크는 `this.perms().includes("use")` 를 템플릿·코드에 인라인으로 쓴다. 별도 computed 로 묶지 않는다.
- `restricted` 입력은 `[restricted]="!perms().includes('use')"` 형태로 인라인 전달. (별도 `canUse` / `restricted` computed 만들지 않는다.)
- 권한 체크 뒤에 추가 조건(데이터 상태 등)이 결합되어 **같은 결합이 2회 이상 참조될 때만** computed 로 묶는다.

```ts
canEdit = computed(() => this.perms().includes("edit") && this.data().state === "작성");
```

- list/detail 의 effect 진입에서도 인라인으로 가드:

```ts
effect(() => {
  if (!this.perms().includes("use")) {
    this.initialized.set(true);
    return;
  }
  // ...
});
```

## 에러·토스트

비동기 작업은 `_sdToast.try(async () => { ... })` 로 감싼다. 안에서 throw 된 에러는 토스트로 표시되고 외부로 전파되지 않는다.

```ts
private readonly _sdToast = inject(SdToastProvider);

// ...

this.busyCount.update((v) => v + 1);
await this._sdToast.try(async () => {
  await this._refresh();
});
this.busyCount.update((v) => v - 1);
```

**메시지 직접 표시**:

- `_sdToast.success("저장되었습니다.")`
- `_sdToast.warning("...")`
- `_sdToast.info("...")`
- `_sdToast.danger("...")`

**중복 작업 가드**: 진행 중인 작업이 있으면 새 작업은 건너뛴다.

```ts
if (this.busyCount() > 0) return;
```

## DI 명명

`inject()` 한 의존은 외부 노출 멤버(시그널·output·공개 메서드 등)와 구분하기 위해 `_` prefix 를 붙인다.

```ts
private readonly _sdToast = inject(SdToastProvider);
private readonly _sdModal = inject(SdModalProvider);
private readonly _appOrm = inject(AppOrmProvider);
private readonly _router = inject(Router);
```

- 시그널·input·output·공개 메서드는 prefix 없이.
- 항상 `private readonly`.

## 모달 호출

화면에서 다른 화면을 모달로 띄울 때:

```ts
private readonly _sdModal = inject(SdModalProvider);

// ...

const result = await this._sdModal.showAsync({
  type: OutboundInstructionHeaderDetail,
  title: "출고지시 등록",
  inputs: { /* 모달 컴포넌트의 input 들 */ },
});
if (!result) return;

// result 처리
```

- **`type`** — `SdModal` 을 구현(상속)한 컴포넌트 클래스.
- **`title`** — 모달 헤더 제목.
- **`inputs`** — 모달 컴포넌트가 받을 input 시그널 값. 없으면 `{}`.
- **반환값** — 모달 컴포넌트가 close 시 emit 한 페이로드. 사용자가 닫기(X)/취소로 닫으면 `undefined`.

## `mark` 헬퍼

`@simplysm/angular` 의 `mark(signal)` 은 시그널 값은 그대로 두고 **변경 알림만** 발행한다. effect 가 의존하는 시그널을 강제로 재발화시키거나, 객체 시그널 내부 필드 변경을 알릴 때 쓴다.

**1. 외부 트리거로 effect 다시 돌리기** — 값은 같지만 effect 를 다시 발화시켜야 할 때.

```ts
doRefresh(): void {
  mark(this.lastFilter);
}
```

**2. 객체/배열 시그널 내부 변경 알리기** — 시그널이 들고 있는 객체의 _필드만_ 바뀌면 시그널은 변경 알림을 보내지 않는다. 양방향 바인딩 자식의 변경 이벤트에 묶어 호출.

```ts
filter = signal<IFilter>({ name: "", state: "" });
```

```html
<sd-textfield [(value)]="filter().name" (valueChange)="mark(filter)" />
```

```ts
data().dueDate = new DateOnly();
mark(this.data);
```

## list 데이터 흐름

list 컴포넌트는 자체 검색·페이지·정렬·재조회를 책임진다.

### 시그널 구성

```ts
items = signal<IItem[]>([]);
selectedKeys = signal<TKey[]>([]);
page = signal(0);
pageLength = signal(0);
sortingDefs = signal<SortingDef[]>([]);

filter = signal<IFilter>({ ... });          // 폼 입력용
lastFilter = signal<IFilter>({ ... });      // 마지막 조회 시점 — effect 가 이걸 의존

trackByFn = (item: IItem) => item.id;
```

**`filter` vs `lastFilter` 분리**: 폼을 만지는 동안 매번 재조회되지 않게 하기 위해. 사용자가 조회 버튼을 눌러야 `lastFilter` 가 갱신되고 effect 가 발화한다.

### 자동 재조회 effect

```ts
constructor() {
  effect(() => {
    if (!this.perms().includes("use") || !this.ready()) {
      this.initialized.set(true);
      return;
    }

    this.lastFilter();     // 의존성 등록
    this.page();
    this.sortingDefs();

    void untracked(async () => {
      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });
  });
}
```

- `lastFilter` / `page` / `sortingDefs` 변경 시 자동 재조회.
- 비동기 본체는 `untracked` 안에서 실행해 자기 자신이 의존성에 들어가지 않게 한다.

### 조회 트리거

```ts
onFilterSubmit(): void {
  this.page.set(0);
  this.lastFilter.set({ ...this.filter() });   // effect 발화
}

doRefresh(): void {                            // 부모(view)가 호출하는 외부 API
  if (!this.perms().includes("use")) return;
  mark(this.lastFilter);                       // 값은 같지만 effect 재발화
}
```

### `_refresh` 구조

```ts
private async _refresh(): Promise<void> {
  const r = await this._search(true);
  this.items.set(r.items);
  this.pageLength.set(r.pageLength);
}
```

`_search` 는 ORM 쿼리 실행. 자세한 사용은 [orm.md](./orm.md) 참조.

### 페이지네이션

두 패턴 중 택일. 데이터 규모와 검색·정렬 책임에 따라 화면 작성자가 판단(명확한 컷오프 없음).

**서버 페이징** — 한 페이지 분량만 매번 서버에서 가져옴. 위 §시그널 구성/effect/`_refresh` 가 가정한 디폴트 패턴.

- `pageLength` 시그널을 두고 `_refresh` 에서 서버 응답의 총 페이지 수로 set.
- `page` / `sortingDefs` / `lastFilter` 모두 effect 의존성. 변경 시 재조회.
- `<sd-crud-list>` 에 `[totalPageCount]="pageLength()"` 전달. `[itemsPerPage]` 는 생략(=0).

**클라이언트 페이징** — 전체 데이터를 한 번에 로드, 시트가 자체 slice/sort.

- `pageLength` 시그널·`sortingDefs` effect 의존성 불필요. (정렬은 시트 내부에서 처리.)
- `_refresh` 는 전체 아이템을 한 번에 `items.set(all)`.
- `<sd-crud-list>` 에 `[itemsPerPage]="<페이지당 행 수>"` 전달. `[totalPageCount]` 는 생략(=0).
- `[(sorts)]` 는 화면이 정렬 상태를 들고 있어야 할 때만 묶음. 아니면 생략.

**`[visiblePageCount]`** (기본 10) — 페이지네이터가 한 번에 표시하는 페이지 번호 개수. 두 패턴 모두 사용자가 명시 지시한 경우에만 명시.

### 외부 input 을 filter 에 반영

list 가 다른 화면 안에 임베드되어 외부에서 filter 의 일부를 input 으로 받을 때, effect 로 input → filter → lastFilter 흐름을 만든다.

```ts
constructor() {
  effect(() => {
    const filterInputs: Partial<IFilter> = {
      includeTargetCustomerIds: this.includeTargetCustomerIds() ?? [],
      includeGoodsIds: this.includeGoodsIds() ?? [],
      excludeIds: this.excludeIds() ?? [],
      isIncludeOutOfInventory: this.isIncludeOutOfInventory() ?? false,
      // ...
    };

    untracked(() => {
      this.filter.update((f) => ({ ...f, ...filterInputs }));
      this.lastFilter.set({ ...this.filter() });
      this.page.set(0);
    });
  });
}
```

- 외부 input 이 effect 의존성. 변경 시 발화.
- input 값을 `Partial<IFilter>` 로 모아 `filter` 에 머지.
- `lastFilter` 갱신 → 자동 재조회 effect 발화.
- `page.set(0)` 으로 첫 페이지로 리셋.

## detail 데이터 흐름

detail 컴포넌트는 식별자를 받아 자체 로드/저장하고, 변경·삭제 후 `submitted` 로 부모에게 알린다.

### 시그널 구성

```ts
dataId = input.required<number>();   // 식별자 (부모가 주입)
submitted = output<boolean>();       // 변경·삭제 후 알림

data = signal<IData>({ ... initialState ... });
private _orgData?: IData;            // 변경 추적용 원본 스냅샷
```

### 로드 effect + 페이지 이탈 가드

```ts
constructor() {
  effect(() => {
    this.dataId();   // 식별자 변경 시 재조회

    if (!this.perms().includes("use")) {
      this.initialized.set(true);
      return;
    }

    void untracked(async () => {
      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });
  });

  setupCanDeactivate(() => this._checkIgnoreChanges());
}
```

- 식별자(`dataId`) 변경이 effect 의존성. 부모가 다른 항목으로 전환하면 자동 재로드.
- `setupCanDeactivate(fn)` (`@simplysm/angular`) 는 라우터 이탈 시점에 `fn()` 이 false 면 이탈을 막는다.

### `_refresh` + 원본 스냅샷

```ts
private async _refresh(): Promise<void> {
  const loaded = await this._appOrm.connectAsync(async (db) => {
    // ...쿼리...
    return loadedData;
  });

  this.data.set(loaded);
  this._orgData = obj.clone(loaded);   // 변경 비교용 사본
}
```

`obj.clone` / `obj.equal` 은 `@simplysm/core-common`.

### 변경 가드

```ts
private _checkIgnoreChanges(): boolean {
  return (
    this._orgData == null ||
    obj.equal(this.data(), this._orgData) ||
    confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?")
  );
}
```

### 저장 패턴

```ts
async onSubmit(): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("edit")) return;

  const data = this.data();
  if (this._orgData && obj.equal(data, this._orgData)) {
    this._sdToast.info("변경사항이 없습니다.");
    return;
  }

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    await this._appOrm.connectAsync(async (db) => {
      // ... 변경분만 upsert/delete (orm.md 참조) ...
    });
    this._sdToast.success("저장되었습니다.");
    await this._refresh();
    this.submitted.emit(true);
  });
  this.busyCount.update((v) => v - 1);
}
```

**핵심 약속**:

- 식별자는 `input.required<>` 로 받는다.
- 로드 후 `_orgData = obj.clone(loaded)` 로 원본 보관.
- 페이지 이탈 가드는 `setupCanDeactivate` + `obj.equal` 비교.
- 저장 끝나면 `_refresh()` 로 다시 로드 → `submitted.emit(true)`.
- 삭제·취소 등 다른 액션도 끝에 `submitted.emit(true)` 를 emit 해 부모(list)가 새로고침할 수 있게 한다.

## 시트 컬럼·셀 표준

```html
<sd-sheet-column [key]="'name'" [header]="'이름'">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm">{{ item.name }}</div>
  </ng-template>
</sd-sheet-column>
```

**폭 약속**:

- `[width]` 는 **명시하지 않음이 기본** — 자동. px 지정은 사용자가 명시 지시한 경우에만.
- 영역 폭(`flex-min` 의 `style="width: ..."` 등) 도 동일.

**셀 본문 약속**:

- 시트 셀에는 패딩이 없으므로 본문 div 에 `p-xs-sm` 클래스를 붙이는 게 기본.
- 정렬 클래스(`tx-right` / `tx-center` / `tx-left`)는 **사용자가 명시 지시한 경우에만** 사용. 기본은 미지정(브라우저 기본 left). "숫자는 우측", "라벨은 가운데" 같은 자동 휴리스틱 적용 금지.
- `[cell]="items()"` 는 타입 추론용 더미 — 실제 행 데이터는 `<sd-sheet>` 의 `[items]` 가 들고 있다.
- 셀 컨텍스트: `let-item="item"` / `let-index="index"` / `let-depth="depth"` / `let-edit="edit"`.

**list 안에서**: `<sd-crud-list>` 의 직속 자식으로 `<sd-sheet-column>` 을 두면 내부 시트로 자동 투영된다.

```html
<sd-crud-list ...>
  <ng-template #filterTpl>...</ng-template>

  <sd-sheet-column [key]="..." [header]="...">
    <ng-template [cell]="items()" let-item="item">...</ng-template>
  </sd-sheet-column>
</sd-crud-list>
```

### 요약 행

컬럼에 `<ng-template #summaryTpl>` 을 두면 시트의 헤더 영역 하단(`thead` 내부)에 요약 행이 렌더된다. 스크롤 시 헤더와 함께 상단 고정되며, 배경은 warning 계열로 자동 강조된다.

```html
<sd-sheet-column [key]="'quantity'" [header]="'수량'">
  <ng-template #summaryTpl>
    <div class="p-xs-sm tx-right">{{ totalQuantity() }}</div>
  </ng-template>
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm tx-right">{{ item.quantity }}</div>
  </ng-template>
</sd-sheet-column>
```

- 컬럼 중 하나라도 `#summaryTpl` 을 가지면 요약 행 전체가 활성화된다. 정의 없는 컬럼은 빈 셀.
- 셀 본문 약속(`p-xs-sm`, 정렬 클래스 등)은 요약 셀에도 동일하게 적용.
- 합계·평균 등 집계 값은 시트가 계산해주지 않는다. 화면 컴포넌트에서 `computed` 로 직접 만들어 노출한다.

```ts
totalQuantity = computed(() => this.items().sum((i) => i.quantity) ?? 0);
```

## 폼·입력 컨트롤

### 폼 항목 레이아웃

label + 입력 그룹을 묶는 전용 클래스 3종:

- `form-box` — 세로 스택. `> div` 또는 `> div` 안에 `<label>` + 입력. 항목 사이 `gap-default`.
- `form-box-inline` — 가로 인라인 flex (wrap). 라벨이 입력 옆에 붙음. 검색·필터폼에 사용. 라벨 없는 `form-box-item` 도 허용 (버튼 등).
- `form-table` — `<table>` 기반. `<th>` 가 우측 정렬 라벨, `<td>` 가 입력. `<th class="form-table-header">` 는 섹션 헤더(좌측 정렬, 회색, 위쪽 여백 큼). 라벨/입력 폭을 정렬해야 하는 등록·편집 폼에 사용.

```html
<div class="form-box-inline">
  <div>
    <label>기준 일자</label>
    <sd-modal-select-button [(value)]="baseDate" ...>{{ baseDate() ?? "선택" }}</sd-modal-select-button>
  </div>
  <div>
    <sd-button [theme]="'primary'" (click)="onCompareButtonClick()">비교</sd-button>
  </div>
</div>
```

### 양방향 바인딩 + `mark`

객체 시그널 내부 필드를 양방향으로 묶고, 변경 시 [`mark` 헬퍼] 로 알린다.

```html
<sd-textfield [(value)]="data().name" (valueChange)="mark(data)" />
```

### 표준 입력 컨트롤

| 용도                 | 컨트롤                                                       |
| -------------------- | ------------------------------------------------------------ |
| 텍스트 / 숫자 / 날짜 | `<sd-textfield [type]="..." />`                              |
| 날짜 범위            | `<sd-date-range-picker [(from)] [(to)] />`                   |
| 정적 선택지          | `<sd-select>` + `<sd-select-item>`                           |
| 공유 데이터 선택지   | `<sd-shared-data-select [items]>` + `<ng-template [itemOf]>` |
| 체크박스 / 라디오    | `<sd-checkbox [radio]>`                                      |
| 라벨/배지            | `<sd-label [theme]>`                                         |
| 버튼/액션            | `<sd-button>`, `<sd-anchor>`                                 |

### 버튼 스타일

화면 액션 `<sd-button>` 은 역할별로 `theme`·`size` 를 구분.

| 역할                                                          | `[theme]`                                                                   | `[size]` |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| 데이터 자체를 통으로 변경하는 최상위 액션 (저장·삭제·생성 등) | 일반 시리즈 (`primary` / `danger` / `success` / `warning` 등 의미에 맞춰)   | 기본     |
| 위 액션 옆 유틸리티 버튼 (양식 다운로드·인쇄 등)              | link 시리즈 (`link-primary` 등)                                             | 기본     |
| 시트 위(또는 시트 셀 안)에 나열되는 버튼                      | link 시리즈 또는 `link`                                                     | `sm`     |

### `<sd-form>` 으로 감싸기

폼 안 입력에서 enter 키 → submit 자동 처리되게 하려면 `<sd-form>` 으로 감싸고 `(formSubmit)` 로 받는다. `sd-crud-list` / `sd-crud-detail` 는 내부에 이미 `sd-form` 을 갖고 있어 별도 래핑 불필요.

## 서비스 호출 (`AppServiceProvider`)

```ts
private readonly _appService = inject(AppServiceProvider);

await this._appService.user.someMethod(...);
this._appService.authInfoEvent.subscribe(...);
```

Provider 정의·서비스 추가 컨벤션은 [client-setup.md#appserviceprovider](./client-setup.md#appserviceprovider) 참조.

## ORM 호출 (`AppOrmProvider`)

```ts
private readonly _appOrm = inject(AppOrmProvider);

await this._appOrm.connectAsync(async (db) => {
  // db.someTable()...
});
```

- 기본은 `connectAsync` (트랜잭션). `connectWithoutTransAsync` 는 트랜잭션 안에서 동작하지 않는 작업용 헬퍼.
- 쿼리 작성은 [orm.md](./orm.md), Provider 정의 컨벤션은 [client-setup.md#appormprovider](./client-setup.md#appormprovider) 참조.

## 공유 데이터 (`useSharedSignal`)

마스터 데이터(고객사·품목 등)는 `AppSharedDataProvider` 에 등록되어 있고, 화면에서는 `useSharedSignal(name)` 으로 접근한다.

```ts
sharedCustomers = useSharedSignal("고객사");

// sharedCustomers.items()  — 시그널, 항목 배열
// sharedCustomers.get(id)  — id 로 단건 조회
```

```html
<sd-shared-data-select [items]="sharedCustomers.items()" [(value)]="data().customerId" ... />
```

새 마스터 데이터 등록·Provider 정의 컨벤션은 [client-setup.md#appshareddataprovider](./client-setup.md#appshareddataprovider) 참조.

## 레이아웃·유틸 클래스

**화면 레이아웃** (영역 분할): flex 유틸 클래스.

상하 분할 (상단 고정 + 본문 fill):

```html
<div class="flex-column fill">
  <div class="pb-sm">
    <!-- 상단 고정 영역 -->
  </div>
  <div class="flex-fill">
    <!-- 본문 (남은 공간 자동) -->
  </div>
</div>
```

좌우 분할 (좌측 콘텐츠 폭 + 우측 fill):

```html
<div class="flex-row fill">
  <div class="flex-min">
    <!-- 좌측 -->
  </div>
  <div class="flex-fill">
    <!-- 우측 -->
  </div>
</div>
```

자주 쓰는 유틸:

- **Flex**: `flex-row` / `flex-column` (컨테이너), `flex-fill` (남은 공간), `flex-min` (콘텐츠 크기), `gap-sm` / `gap-default`.
- **부모 가득**: `fill`.
- **패딩**: `p-{vertical}-{horizontal}` (예: `p-default`, `p-xs-sm`, `p-sm-default`). 단일 방향: `pt-` / `pb-` / `pl-` / `pr-`.
- **텍스트**: `tx-left` / `tx-center` / `tx-right`.
- **테마 색**: 텍스트 `tx-theme-{theme}-default`, 배경 `bg-{theme}-lightest`.
- **테두리**: `bd`, `bd-radius-default`, `bd-trans-light`.

**약속**:

- 영역 분할·배치 모두 flex 유틸 클래스 우선. 자체 styles 작성은 마지막 수단.
- 글로벌 클래스 정의는 `@simplysm/angular/scss/commons/`.

## 아이콘

`@ng-icons/core` 의 `NgIcon` + `@ng-icons/tabler-icons` 의 `tabler*` 셋트를 사용한다.

```ts
import { NgIcon } from "@ng-icons/core";
import { tablerCheck, tablerCirclePlus } from "@ng-icons/tabler-icons";

@Component({
  imports: [NgIcon /* ... */],
  template: `
    <ng-icon [svg]="tablerCheck" />
    <ng-icon [svg]="tablerCirclePlus" />
  `,
})
export class SomeComponent {
  protected readonly tablerCheck = tablerCheck;
  protected readonly tablerCirclePlus = tablerCirclePlus;
}
```

**약속**:

- 아이콘 셋트는 `tabler-icons` 통일.
- 사용할 아이콘은 컴포넌트 클래스에 `protected readonly tablerXxx = tablerXxx` 로 노출 후 템플릿에서 `[svg]` 바인딩.

## sd-crud-* 컴포넌트

목록 화면 표준 골격 `sd-crud-list`, 단건 편집 화면 표준 골격 `sd-crud-detail`. 화면 작성 시 이 둘을 채택할지 결정한다. 채택 시 사용법은 [client-crud.md](./client-crud.md).
