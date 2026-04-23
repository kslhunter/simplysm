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

- **컬럼 key는 `"_isDeleted"`** (언더스코어 prefix). DB 컬럼 key와 분리하여 서버 정렬·시트 지속성 설정 충돌을 방지한다.
- **`canEdit() && viewType() === "page"` 조건부.** modal/control 뷰나 권한 없음이면 열 자체 숨김.

> 공통 규칙(`mark` 저장 감지 오해, 시트 셀 `[inset]/[size]`, 삭제 방식 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) + [확장 B: 선택 기능 + 선택 삭제/복구](./extension-b-selection.md)
