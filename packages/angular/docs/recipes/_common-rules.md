# 레시피 공통 규칙

CRUD 리스트·상세폼, 데이터 선택 버튼, 페이지·모달 컨테이너 레시피 전반에 적용되는 횡단 규칙 모음. 각 레시피 고유 규칙은 해당 recipe 문서 내부에 둔다.

## 적용 범위

아래 레시피와 그 확장에 모두 적용된다.

- [`crud-list.md`](./crud-list.md) 및 `crud-list/extension-*`
- [`crud-detail.md`](./crud-detail.md) 및 `crud-detail/extension-*`
- [`data-select-button.md`](./data-select-button.md)
- [`page-modal-container.md`](./page-modal-container.md)

## ✅ Always (반드시)

### `injectViewTypeSignal()`은 생성자 또는 필드 이니셜라이저에서만 호출한다

```typescript
// ❌ computed/effect/일반 메서드 콜백 안에서 호출 — NG0203
canEdit = computed(() => {
  const type = injectViewTypeSignal()(); // 런타임 에러
  return type === "page";
});

// ✅ 생성자·필드 이니셜라이저에서 한 번만 호출, 이후엔 signal을 읽는다
private _viewType = injectViewTypeSignal();
canEdit = computed(() => this._viewType() === "page");
```

**근거**: Angular `inject()`는 injection context에서만 호출 가능하다. 생성자 시점에 signal로 캡처해 두면, 이후 computed 안에서 **읽기**는 문제없다 (`packages/angular/src/core/routing/injectViewTypeSignal.ts:7`).

### page 컴포넌트가 `<sd-topbar-container>`와 `<sd-topbar>`를 소유한다

마스터-디테일 구조(시트 + 상세를 나란히 배치하는 페이지)에서 페이지 타이틀·주요 액션을 담는 `<sd-topbar-container>` + `<sd-topbar>`는 **page 컴포넌트에만** 둔다. 임베딩되는 sheet·detail control 컴포넌트에서는 `<sd-dock-container>`만 사용한다.

```html
<!-- ❌ page에 topbar 없이, control 컴포넌트 내부에 <sd-topbar-container> 배치 -->
<!-- Page -->
<div class="flex-row fill">
  <app-sheet />
  <app-detail /> <!-- 내부에 <sd-topbar-container> -->
</div>

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

### 시트 셀 내부 컨트롤에 `[inset]="true" [size]="'sm'"`을 명시한다

상세: [셀 내용 작성 지침](../ui-data/sd-sheet.md#sdsheetcolumncelltemplate)

`<sd-sheet-column>`의 `[cell]` 템플릿 안에 들어가는 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 **항상** `[inset]="true" [size]="'sm'"`을 함께 명시한다.

```html
<!-- ❌ inset/size 누락 — 셀 경계가 깨지고 크기가 맞지 않음 -->
<ng-template [cell]="column" let-item="item">
  <sd-textfield [(value)]="item.name" />
</ng-template>

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

`SdCommandDirective`(`[sdSaveCommand]` / `[sdRefreshCommand]` / `[sdInsertCommand]`)는 **document 레벨** keydown 리스너를 등록한다(`packages/angular/src/core/commands/sd-command.ts:40`). 같은 화면에서 여러 컴포넌트에 부착하면 모두 발동된다. 마스터-디테일 구조에서 sheet와 detail 양쪽에 `sdRefreshCommand`를 부착하면 Ctrl+Alt+L 시 양쪽 `_refresh()`가 동시에 실행된다.

**판단 기준**:

- `_refresh()` / `onSubmit()`을 **직접 소유하는** 컴포넌트에만 부착한다.
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
// ❌ input 변경에 반응하지 않음 — 최초 1회만 실행
constructor() {
  void this._initAsync();
}
private async _initAsync(): Promise<void> { /* ... this.someInput() ... */ }

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
// ❌ this.someInput()은 항상 기본값 → ?? [] 가 매번 실행되어 의미 없는 코드
filter = signal<IFilter>({
  includeIds: this.includeIds() ?? [],
  isIncludeDeleted: this.isIncludeDeleted() ?? false,
});

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
// ❌ mark 호출 여부로 저장 가능 여부를 판단 — 의미 없는 분기
onSubmit() {
  if (this._lastMarkCalled) {  // "mark가 호출됐으니 변경이 있다"는 잘못된 전제
    void this._saveAsync();
  }
}

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
