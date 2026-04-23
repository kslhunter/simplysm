# 레시피 공통 규칙

CRUD 리스트·상세폼, 데이터 선택 버튼, 페이지·모달 컨테이너 레시피 전반에 적용되는 횡단 규칙 모음. 각 레시피 고유 규칙은 해당 recipe 문서 내부에 둔다.

## 적용 범위

아래 레시피와 그 확장에 모두 적용된다.

- [`crud-list.md`](./crud-list.md) 및 `crud-list/extension-*`
- [`crud-detail.md`](./crud-detail.md) 및 `crud-detail/extension-*`
- [`data-select-button.md`](./data-select-button.md)
- [`page-modal-container.md`](./page-modal-container.md)

## ✅ Always (반드시)

### Full-screen Dock 레이아웃과 Flex 정렬을 구분한다

페이지는 **뷰포트 전체를 full-screen으로 채운 뒤, dock으로 고정 영역을 배치하고, 나머지 fill 영역에 스크롤이 생기는** 구조다. 페이지 전체가 스크롤되는 것이 아니라, 필터·액션 바 등 dock 영역은 항상 화면에 고정되고 **fill 영역(시트·폼 등)만 독립적으로 스크롤**된다.

Dock과 Flex는 역할이 다르며 혼용하지 않는다.

| 수단 | 역할 | 스크롤 | 예시 |
|------|------|--------|------|
| `<sd-dock>` | **고정 구획** — 필터, 액션 바, 하단 버튼 등 항상 보여야 하는 영역 | 스크롤 없음 (absolute 고정) | `<sd-dock class="p-default pb-0">` (필터) |
| `fill` 영역 | **나머지 공간** — dock이 차지하지 않은 나머지를 채움 | **스크롤 발생** (`overflow: auto`) | `<div class="fill p-default">` (시트) |
| `flex-row` / `flex-column` | **컨트롤 정렬** — dock 내부에서 버튼·인풋 등 작은 요소 배치 | 부모를 따름 | `<sd-dock class="flex-row gap-sm">` (버튼 나열) |

#### Full-screen 높이 체인과 스크롤

전체 화면을 빈틈 없이 채우려면 `height: 100%` 체인이 끊기지 않아야 한다. 이 체인이 유지되어야 fill 영역이 정확한 높이를 가지고, 그 안에서만 스크롤이 동작한다.

```
viewport (100vh)
└─ <sd-topbar-container>              ← height: 100%, flex-column
   ├─ <sd-topbar>                     ← 고정 (페이지 타이틀 + 메인 액션)
   └─ <sd-dock-container>             ← height: 100% (나머지 채움)
      ├─ <sd-dock>                    ← 고정 (필터)
      ├─ <sd-dock>                    ← 고정 (인라인 액션: 등록/삭제/엑셀)
      ├─ <div class="fill">          ← 나머지 = 스크롤 영역 (시트/폼)
      └─ <sd-dock position="bottom">  ← 고정 (모달 하단 확인/취소)
```

#### Dock vs Flex 판단 기준

- **화면 구획 배치**(필터, 시트, 하단 액션 바 등 독립 영역 분할) → `<sd-dock-container>` + `<sd-dock>` + `fill`
- **컨트롤 정렬**(버튼 나란히, 라벨+인풋, 우측 정렬 등 구획 내부 배치) → `flex-row` / `flex-column` / `flex-fill` / `main-align-*`

```html
<!-- ✅ 구획은 dock으로 고정, fill 영역에서만 스크롤 -->
<sd-dock-container>
  <sd-dock class="p-default pb-0">필터 영역</sd-dock>
  <div class="fill p-default">시트 영역 (여기만 스크롤)</div>
</sd-dock-container>
```

**예외**: modal 뷰 본문처럼 dock이 불필요한(단순 상하 2분할) 경우에는 `<div class="flex-column fill">` + `<div class="flex-fill">`을 사용한다 — [`page-modal-container.md` modal 전용 변형](./page-modal-container.md#modal-전용-pagecontrol-분기-생략) 참조.

### topbar / dock 내 버튼 배치 순서를 지킨다

`<sd-topbar>`, `<sd-dock>` 등 메인 액션 영역에 여러 버튼을 배치할 때, **중요도순(왼쪽 → 오른쪽)**으로 나열한다.

```
저장(primary) > 삭제/복구(danger/warning) > 기타 액션
```

```html
<!-- ✅ 저장 > 삭제/복구 > 기타 순서 -->
<sd-topbar>
  <h4>{{ viewTitle() }}</h4>
  @if (canEdit()) {
    <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">저장</sd-button>
  }
  @if (!isNew() && canEdit()) {
    <sd-button [theme]="'link-danger'" (click)="onDeleteButtonClick()">삭제</sd-button>
  }
</sd-topbar>
```

**근거**: 데이터 변경 액션(저장·삭제·복구)이 먼저, 나머지 기타 액션이 마지막이다. page topbar뿐 아니라 control 뷰의 상단 dock, modal 뷰의 하단 dock에도 동일 순서를 적용한다.

### 화면 레이아웃 구간과 버튼 스타일을 구분한다

CRUD 리스트·상세폼 화면은 아래 구간으로 나뉘며, 각 구간의 버튼 스타일이 다르다. **다른 구간의 스타일을 섞지 않는다.**

#### 레이아웃 구간 (crud-list 기준)

```
┌─ ① 메인 액션 영역 ──────────────────────────────────────┐
│  page:    <sd-topbar> 내부                               │
│  control: 상단 <sd-dock> (p-default bdb ...)             │
│  modal:   하단 <sd-dock [position]="'bottom'">           │
├─ ② 조회 필터 ───────────────────────────────────────────┤
│  <sd-dock class="p-default pb-0">                        │
│    <sd-form> 조회 버튼, 검색어 등                         │
├─ ③ 인라인 액션 dock ────────────────────────────────────┤
│  <sd-dock class="flex-row gap-sm p-xs-default">          │
│    등록, 선택삭제/복구, 엑셀 업/다운 등                    │
├─ ④ 시트 ────────────────────────────────────────────────┤
│  <div class="fill p-default pt-0"> <sd-sheet ...>        │
└──────────────────────────────────────────────────────────┘
```

③ 인라인 액션 dock이 있을 때 ④ 시트 영역에 `pt-0`을 붙여 상단 패딩 중복을 제거한다. ③이 없는 조회 전용 리스트에서는 `pt-0` 없이 `fill p-default`를 사용한다.

crud-detail 기준에서는 ②③④ 대신 폼 본문(`<sd-form>` + `form-table`)이 들어간다. ① 메인 액션 영역의 구간 규칙은 동일하다 (단, crud-list의 control 뷰에서는 ① 상단 dock 불필요).

#### 구간별 버튼 스타일

| 구간 | dock 클래스 | 버튼 테마 | 크기 | 예시 |
|------|------------|----------|------|------|
| ① topbar (page) | — | link-style (`'link-primary'`, `'link-danger'`, `'link-warning'`) | 기본값 | 저장, 삭제, 복구 |
| ① 상단 dock (control) — 주요 액션 | `p-default flex-row gap-default bdb bdb-theme-gray-lightest` | solid (`'primary'`, `'danger'`, `'warning'`, `'success'`) | 기본값 | 저장, 삭제, 상태 변경 |
| ① 상단 dock (control) — 보조 액션 | 위와 같은 dock 내부 | link-style (`'link-warning'`, `'link-success'`, `'link-info'`) | 기본값 | 출력, 다운로드 |
| ① 하단 dock (modal) | `p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest` | solid (`'primary'`, `'danger'`, `'warning'`, `'gray'`) | `'sm'` | 확인, 취소, 삭제, 복구 |
| ③ 인라인 액션 dock | `flex-row gap-sm p-xs-default` | link-style (`'link-primary'`, `'link-success'`, `'link-danger'`) | `'sm'` | 등록, 선택삭제, 엑셀 |

```html
<!-- ✅ topbar = link-style 기본 크기 / 인라인 dock = link-style sm -->
<sd-topbar>
  <sd-button [theme]="'link-primary'"> 저장 </sd-button>
  <sd-button [theme]="'link-danger'"> 삭제 </sd-button>
</sd-topbar>
<sd-dock class="flex-row gap-sm p-xs-default">
  <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()"> 등록 </sd-button>
</sd-dock>
```

**근거**: topbar는 페이지 전체 액션, 인라인 dock은 시트 직전의 데이터 조작 액션이다. 시각적 위계가 다르므로 크기와 테마로 구분한다. ① 상단/하단 dock은 topbar가 없는 뷰에서 메인 액션을 배치하며, solid 테마와 border(`bdb`/`bdt`)로 영역을 구분한다. 상단 dock 내에서도 주요 액션(저장·삭제·상태 변경)은 solid 테마로, 보조 액션(출력·다운로드)은 link-style 테마로 시각적 위계를 나눈다. ③ 인라인 액션 dock은 가볍게 배치하므로 border 없이 `p-xs-default`로 최소 패딩만 둔다.

### `injectViewTypeSignal()`은 생성자 또는 필드 이니셜라이저에서만 호출한다

```typescript
// ✅ 생성자·필드 이니셜라이저에서 한 번만 호출, 이후엔 signal을 읽는다
private _viewType = injectViewTypeSignal();
canEdit = computed(() => this._viewType() === "page");
```

**근거**: Angular `inject()`는 injection context에서만 호출 가능하다. 생성자 시점에 signal로 캡처해 두면, 이후 computed 안에서 **읽기**는 문제없다 (`packages/angular/src/core/routing/injectViewTypeSignal.ts:7`).

### page 컴포넌트가 `<sd-topbar-container>`와 `<sd-topbar>`를 소유한다

마스터-디테일 구조(시트 + 상세를 나란히 배치하는 페이지)에서 페이지 타이틀·주요 액션을 담는 `<sd-topbar-container>` + `<sd-topbar>`는 **page 컴포넌트에만** 둔다. 임베딩되는 sheet·detail control 컴포넌트에서는 `<sd-dock-container>`만 사용한다.

```html
<!-- ✅ page가 topbar를 소유, control은 sd-dock-container만 -->
<!-- Page -->
<sd-topbar-container>
  <sd-topbar><h4>{{ viewTitle() }}</h4> ...</sd-topbar>
  <div class="flex-row fill">
    <app-sheet />   <!-- 내부: <sd-dock-container> -->
    <app-detail />  <!-- 내부: <sd-dock-container> -->
  </div>
</sd-topbar-container>
```

**근거**: control 뷰는 page의 일부로 포함되므로 topbar 중첩이 발생하면 레이아웃이 깨진다. control 내부 도구바(필터·등록·저장 등)는 `<sd-dock-container>` + `<sd-dock>`으로 구성한다.

### 마스터-디테일 좌측 시트에 `[autoSelect]="'focus'"`를 적용한다

마스터-디테일 구조(좌측 리스트 + 우측 상세)에서, 좌측 시트에 `[autoSelect]="'focus'"`를 추가한다. 사용자가 행에 포커스를 이동하면(키보드 탐색 포함) 즉시 선택되어 우측 디테일 패널이 반응한다.

```html
<sd-sheet
  [selectMode]="'single'"
  [autoSelect]="'focus'"
  [(selectedItems)]="selectedItems"
  ...
>
```

**근거**: 마스터-디테일에서 클릭 없이 키보드 방향키로 행을 탐색할 때 우측 디테일이 따라오지 않으면 UX가 어색하다. `'focus'`는 포커스 이동 시 자동 선택을, `'click'`은 클릭 시 자동 선택을 트리거한다(선택 모달의 single 모드에서 사용 — [확장 D](./crud-list/extension-d-select-modal.md) 참조).

### 시트 셀 내부 컨트롤에 `[inset]="true" [size]="'sm'"`을 명시한다

상세: [셀 내용 작성 지침](../ui-data/sd-sheet.md#sdsheetcolumncelltemplate)

`<sd-sheet-column>`의 `[cell]` 템플릿 안에 들어가는 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 **항상** `[inset]="true" [size]="'sm'"`을 함께 명시한다.

```html
<!-- ✅ -->
<ng-template [cell]="column" let-item="item">
  <sd-textfield [(value)]="item.name" [inset]="true" [size]="'sm'" />
</ng-template>
```

**근거**: 누락해도 컴파일 에러가 발생하지 않으므로 LLM이 빠뜨리기 쉽다. 예외는 "예외 케이스" 섹션 참조.

### input 변경을 effect 내부에서 filter·lastFilter·page에 반영한다

input signal 값이 바뀌었을 때 조회 결과에 반영하려면, **effect에서 감지 → `untracked`로 상태 갱신 → 재조회 트리거** 순서로 구성한다.

```typescript
constructor() {
  effect(() => {
    if (!this.perms().includes("use")) { /* ... */ }

    // input 변경 감지 → lastFilter 재반영
    const ids = this.includeIds() ?? [];
    const lf = this.lastFilter();
    if (!obj.equal(ids, lf.includeIds)) {
      untracked(() => {
        this.filter.update((f) => ({ ...f, includeIds: ids }));
        this.lastFilter.set({ ...this.filter() });
        this.page.set(0);
      });
    }

    // 재조회 트리거 의존성
    this.lastFilter();
    this.page();
    this.sortingDefs();

    void untracked(async () => { /* refresh */ });
  });
}
```

**근거**: filter·lastFilter·page를 갱신하면 effect 의존성이 즉시 재트리거될 수 있으므로, 중간 상태 갱신은 `untracked`로 감싸야 무한 루프를 피한다. 짝 규칙: "signal 필드 초기값에서 다른 signal 읽기" 금지([🚫 Never](#signal-필드-초기값에서-다른-signal을-읽지-않는다) 참조).

## ⚠️ Ask first (조건부)

### 공유 데이터 사용 화면은 `_refresh()` 선두에서 `_sdSharedData.wait()`를 호출한다

화면에서 `useSharedSignal` / `getHandle` 등 `SdSharedDataProvider`를 사용한다면, `_refresh()`의 **첫 줄**에 `await this._sdSharedData.wait();`를 둔다. 공유 데이터가 사용되지 않는 화면이라면 호출하지 않는다.

```typescript
// ✅ 공유 데이터 사용 화면
async _refresh(): Promise<void> {
  await this._sdSharedData.wait();
  /* ... */
}
```

**근거**: 공유 데이터 로딩이 완료되기 전에 렌더하면 셀렉트 드롭다운 등이 빈 상태로 노출된다 (`packages/angular/src/core/shared-data/sd-shared-data.provider.ts:120`).

**판단 기준**: 현재 화면이 `useSharedSignal`(각 앱이 `SdSharedDataProvider` 위에 정의하는 공용 훅 — `@simplysm/angular` 미제공) / `getHandle` / `emitAsync` 중 하나라도 사용하면 호출한다. 하나도 사용하지 않으면 호출하지 않는다.

### `SdCommandDirective` 부착 위치를 한 곳에 둔다

`SdCommandDirective`(`[sdSaveCommand]` / `[sdInsertCommand]`)는 **document 레벨** keydown 리스너를 등록한다(`packages/angular/src/core/commands/sd-command.ts:40`). 같은 화면에서 여러 컴포넌트에 부착하면 모두 발동된다.

**판단 기준**:

- `onSubmit()`을 **직접 소유하는** 컴포넌트에만 부착한다.
- 자식 컴포넌트를 조합만 하는 page 래퍼, 권한 체크·레이아웃만 담당하는 컨테이너에는 부착하지 않는다.
- 마스터-디테일에서는 의도된 쪽 한 곳에만 부착한다 (보통 sheet 쪽).

**근거**: 최상위 모달 판정(`shouldProcessCommandEvent`)은 모달 내부만 구분하고, 형제 컴포넌트 간 구분은 하지 않는다.

### 삭제 방식은 DB 스키마에 따라 결정한다

DB 테이블 스키마에 따라 soft-delete와 물리 삭제 중 하나를 선택한다.

- **`isDeleted` 컬럼이 있는 테이블**: `isDeleted: true` 업데이트로 **soft-delete**. 삭제·복구 토글을 제공한다. `crud-list` 확장 B/C, `crud-detail` 확장 B가 이 경로에 해당한다.
- **`isDeleted` 컬럼이 없는 테이블**: row DELETE로 **물리 삭제**. 복구 기능 없이 바로 삭제한다. 위 확장들은 사용하지 않는다.

**근거**: 동일 화면에서 두 방식을 혼용하면 삭제 의미가 불명확해진다. 컬럼 유무 하나로 결정되므로 선택 기준이 명확하다.

## 🚫 Never (금지)

### input 의존 데이터 로딩에 `void this._initAsync()`를 사용하지 않는다

`input()` / `input.required()` signal 값에 따라 데이터를 로드하는 컴포넌트에서, 생성자에서 `void this._initAsync()`를 호출하고 별도 메서드에서 비동기 로직을 수행하는 패턴은 사용하지 않는다.

```typescript
// ✅ input 변경 시 자동 재실행
constructor() {
  effect(() => {
    this.someInput(); // 의존성 등록 (untracked 바깥)
    void untracked(async () => { /* ... */ });
  });
}
```

**근거**: 생성자 호출은 최초 1회뿐이므로 input signal 변경에 반응하지 못한다.

**대안**: `effect`로 input 의존성을 등록하고, 비동기 작업은 `void untracked(async () => { /* ... */ })`로 감싼다. 최소 뼈대의 초기 effect, [확장 E(조회 전용 modal)](./crud-list/extension-e-readonly-modal.md)의 부모 식별자 input 등 모든 input 의존 로딩에 동일하게 적용된다.

### signal 필드 초기값에서 다른 signal을 읽지 않는다

`signal()` 필드 이니셜라이저에서 `this.someInput()` 같은 다른 signal을 읽지 않는다. 필드 이니셜라이저는 클래스 생성 시점에 실행되며, input signal은 부모로부터 값을 전달받기 전이므로 항상 기본값만 반환한다.

```typescript
// ✅ 기본값만 사용, input 반영은 effect에서 수행
filter = signal<IFilter>({
  includeIds: [],
  isIncludeDeleted: false,
});
```

**근거**: 초기값에서 빼는 것만으로는 부족하다. input 값을 반영하는 로직이 effect 안에 있어야 input 변경 시 filter·lastFilter·page가 갱신된다.

**대안**: [✅ Always의 "input 변경을 effect 내부에서 filter·lastFilter·page에 반영한다"](#input-변경을-effect-내부에서-filterlastfilterpage에-반영한다) 참조.

### `mark(sig)`를 "저장 감지" 수단으로 사용하지 않는다

상세: [`mark` — 역할·주의사항](../utils/mark.md)

`mark(sig)`는 `WritableSignal`의 값을 shallow copy(배열: `[...v]`, 객체: `{...v}`)하여 참조를 갱신한다(`packages/angular/src/core/mark.ts:7`). 역할은 두 가지다.

- **OnPush 템플릿 재렌더링** 유발
- **다른 computed / effect의 의존성 갱신**

```typescript
// ✅ snapshot과 현재값을 obj.equal로 비교하여 변경 판단
onSubmit() {
  if (!obj.equal(this._snapshot(), this.item())) {
    void this._saveAsync();
  }
}

// mark의 용도는 별개 — OnPush 재렌더링과 의존 computed/effect 통지
applyBulkEdit() {
  for (const row of this.items()) row.selected = true;
  mark(this.items); // 배열 참조 갱신 → 템플릿 재렌더링
}
```

**근거**: 값 차이 감지는 `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)의 deep equal이 담당하므로, 필드 mutation은 `mark` 없이도 snapshot 비교(`_checkIgnoreChanges` / `onSubmit` / `diffs()`)에서 감지된다. Chrome 61 호환(`Proxy` 폴리필 불가)으로 signal 자동 notify가 불가해 명시적 호출이 필요할 뿐, "감지"와 "통지"는 별개다.

**대안**: UI 재렌더링과 effect 의존성 갱신이 목적일 때만 `mark`를 사용한다. 저장 여부 판정은 snapshot 비교 로직이 담당한다.

## 예외 케이스

### 시트 셀 `[inset]="true" [size]="'sm'"` 예외

- **복합 구조(텍스트+컨트롤)**: `[inset]="false"`로 셀 외곽을 유지한다.
- **큰 시트 행**: `[size]` 속성을 생략한다.

### 공유 데이터 미사용 화면

`useSharedSignal` / `getHandle` / `emitAsync`를 전혀 사용하지 않는 화면이라면 `_refresh()` 선두의 `await this._sdSharedData.wait();` 호출은 불필요하다.

### `isDeleted` 컬럼이 없는 테이블

soft-delete 관련 확장(`crud-list` 확장 B/C, `crud-detail` 확장 B)을 사용하지 않는다. 삭제 UI는 물리 삭제 단일 경로로만 제공한다.
