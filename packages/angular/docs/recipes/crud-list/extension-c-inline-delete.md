← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 C: inline 삭제/복구 열

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md) + [확장 B: 선택 기능 + 선택 삭제/복구](./extension-b-selection.md) (`isDeleted` 플래그 / `selectedItems` / `getItemCellStyleFn` 취소선은 확장 B가 도입)

확장 B의 상단 "선택 삭제 / 선택 복구" 바(다건 일괄 토글) 위에, 시트 맨 앞 고정 컬럼에 **row별 inline 삭제/복구 아이콘**을 추가한다. 같은 `isDeleted` 플래그를 row별 빠른 토글 경로로 조작하는 보완 관계 — 다건 일괄 토글과 별도 경로가 아니라 **동일 플래그에 대한 다른 진입 UI**다.

> **적용 조건:** DB Table에 `isDeleted` 컬럼이 있는 경우에만 사용한다. 컬럼이 없는 테이블은 물리 삭제(row DELETE)로 처리하며 이 확장을 사용하지 않는다 → [공통 규칙: 삭제 방식](../_common-rules.md#삭제-방식은-db-스키마에-따라-결정한다).

**이 확장이 도입하는 요소:**

- **imports:** `tablerEraser` / `tablerRestore` (확장 B가 이미 imports에 포함한 경우 추가 불필요)
- **메서드:** `onToggleDeleteItemButtonClick(item)` — `item.isDeleted` 토글 후 `mark(this.items)`
- **템플릿:** 시트 맨 앞에 `[fixed]="true" [key]="'_isDeleted'"` 고정 컬럼 추가 + `#headerTpl`(아이콘 헤더) + `[cell]`(`<sd-anchor>` 토글)

> 상세: [`<sd-sheet-column> #headerTpl`](../../ui-data/sd-sheet.md#sdsheetcolumn) · [`<sd-anchor>`](../../ui-form/sd-anchor.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A+B) 위에 번호 순서대로 삽입할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) 메서드 추가
protected onToggleDeleteItemButtonClick(item: ICustomer): void {
  item.isDeleted = !item.isDeleted;
  mark(this.items);   // OnPush 재렌더 + diffs computed 알림
}

// 2) template — <sd-sheet> 가장 앞에 _isDeleted 고정 컬럼 삽입.
//    canEdit() && viewType() === "page" 조건부 (modal/control 뷰나 권한 없음이면 열 자체 숨김)
`
<sd-sheet ...>
  @if (canEdit() && viewType() === "page") {
    <sd-sheet-column [fixed]="true" [key]="'_isDeleted'">
      <ng-template #headerTpl>
        <div class="p-xs-sm tx-center">
          <ng-icon [svg]="tablerEraser" />
        </div>
      </ng-template>
      <ng-template [cell]="items()" let-item="item">
        <div class="p-xs-sm tx-center">
          <sd-anchor [theme]="'danger'" (click)="onToggleDeleteItemButtonClick(item)">
            <ng-icon [svg]="item.isDeleted ? tablerRestore : tablerEraser" />
            {{ item.isDeleted ? "복구" : "삭제" }}
          </sd-anchor>
        </div>
      </ng-template>
    </sd-sheet-column>
  }
  <!-- 나머지 컬럼(id / name / phone / categoryId / ...)은 확장 A/B와 동일 -->
</sd-sheet>
`
```

**포인트:**

- **확장 B와의 보완 관계.** 본 확장의 셀 아이콘 클릭과 확장 B의 상단 바 "선택 삭제 / 선택 복구"가 **같은 `isDeleted` 플래그**를 조작한다. 확장 B가 시트에 바인딩한 `[getItemCellStyleFn]` 취소선 스타일이 본 확장의 row별 토글 결과에도 그대로 반영된다. 선택 체크 없이 한 행만 빠르게 토글할 때는 이 확장, 여러 행을 한 번에 토글할 때는 확장 B를 사용한다.
- **row 삭제는 `isDeleted` 플래그 토글로 표현.** 확장 A / B와 동일 원리. DB 반영은 확장 A의 저장 버튼(또는 Ctrl+S) 클릭 시 일괄 처리(soft-delete) — 상단 바(확장 B)가 confirm 후 즉시 DB 반영하는 것과 달리, 본 확장의 row별 토글은 저장 버튼을 눌러야 반영된다.
- **컬럼 key는 `"_isDeleted"`** (언더스코어 prefix). `_` prefix를 붙여 DB 컬럼 key(`isDeleted` 등)와 분리한다 — 서버 정렬 키·시트 컬럼 지속성 설정 저장소와 충돌하지 않는 임의 키이기 때문. 상세는 아래 [🚫 흔한 실수](#컬럼-key를-isdeleted로-둔다) 참조.
- **`canEdit() && viewType() === "page"` 조건부.** modal/control 뷰나 권한 없음이면 열 자체 숨김. 확장 A의 `canEdit = computed(() => perms().includes("edit") && viewType() === "page")`와 `viewType() === "page"` 이중 조건으로 의도를 선명하게 드러낸다. 본 확장의 셀은 `<sd-anchor>`만 사용하므로 [공통 규칙: 시트 셀 `[inset]/[size]`](../_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다) 대상이 아니다.
- **`mark(this.items)` 호출 이유.** 필드 mutation(`item.isDeleted = !item.isDeleted`)은 signal의 참조를 바꾸지 않으므로, OnPush 재렌더와 `diffs` computed 통지를 위해 명시적 호출이 필요하다. 저장 감지 용도가 아님에 주의 — [공통 규칙: `mark(sig)`](../_common-rules.md#marksig를-저장-감지-수단으로-사용하지-않는다) 참조.

**🚫 흔한 실수**

> 공통 규칙(`mark` 저장 감지 오해, 시트 셀 `[inset]/[size]`, 삭제 방식 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 본 섹션은 **inline 삭제/복구 확장 고유 실수**만 다룬다.

### 컬럼 key를 `"isDeleted"`로 둔다

```html
<!-- ❌ 일반 DB 컬럼 key와 동일한 네이밍 — 서버 정렬 orderBy 키·시트 컬럼 지속성 설정과 충돌 -->
<sd-sheet-column [fixed]="true" [key]="'isDeleted'">
  <ng-template #headerTpl>...</ng-template>
  <ng-template [cell]="items()" let-item="item">...</ng-template>
</sd-sheet-column>

<!-- ✅ 언더스코어 prefix로 분리 — DB 컬럼 key와 충돌하지 않는 임의 키 -->
<sd-sheet-column [fixed]="true" [key]="'_isDeleted'">
  <ng-template #headerTpl>...</ng-template>
  <ng-template [cell]="items()" let-item="item">...</ng-template>
</sd-sheet-column>
```

**근거**: `<sd-sheet-column>`의 `[key]`는 (a) 서버 정렬 `orderBy(key, ...)`의 키, (b) 시트 컬럼 순서·폭 등 지속성 설정(`[key]="'customer-list-sheet'"`에 종속된 저장소)의 컬럼 식별자로 쓰인다. 토글 아이콘 컬럼에 `"isDeleted"`를 그대로 부여하면 실제 DB 컬럼 `isDeleted`와 충돌하여, 사용자가 해당 컬럼 헤더를 드래그해 정렬하거나 폭을 조정할 때 의도하지 않은 저장 키가 덮어써진다. `_` prefix는 레시피 전반의 관례(예: 확장 A의 `_itemsSnapshot`)와 일치하며, 시트 내부 전용 컬럼임을 시각적으로도 구분한다.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) + [확장 B: 선택 기능 + 선택 삭제/복구](./extension-b-selection.md)
