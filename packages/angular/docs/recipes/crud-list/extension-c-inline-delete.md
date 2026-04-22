← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 C: inline 삭제 열

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md)

시트 맨 앞 고정 컬럼에 **row별 inline 삭제/복구 아이콘**을 추가한다. 확장 B("선택 삭제 / 선택 복구" 상단 바)와 **공존** 가능 — row별 빠른 토글 + 다건 일괄 토글.

**이 확장이 도입하는 요소:**

- **메서드:** `onToggleDeleteItemButtonClick(item)`
- **템플릿:** 시트 맨 앞에 `[fixed]="true" [key]="'_isDeleted'"` 컬럼 추가 + `#headerTpl`(아이콘 헤더) + `[cell]`(`<sd-anchor>` 토글)

> 상세: [`<sd-sheet-column> #headerTpl`](../../ui-data/sd-sheet.md#sdsheetcolumn) · [`<sd-anchor>`](../../ui-form/sd-anchor.md)

```typescript
// 1) 메서드 추가
protected onToggleDeleteItemButtonClick(item: ICustomer): void {
  item.isDeleted = !item.isDeleted;
  mark(this.items);   // OnPush 재렌더 + diffs computed 알림
}

// 2) template — <sd-sheet> 가장 앞에 _isDeleted 고정 컬럼 삽입.
//    canEdit && viewType() === "page" 조건부 (modal 뷰나 권한 없으면 열 자체 숨김)
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
  <!-- 나머지 컬럼(id / name / phone / categoryId / ...)은 확장 A와 동일 -->
</sd-sheet>
`
```

**포인트:**

- **row 삭제는 `isDeleted` 플래그 토글로 표현**. 확장 A / B와 동일 원리. DB 반영은 저장 버튼 클릭 시 일괄 처리(soft-delete).
- **컬럼 key는 `"_isDeleted"`** (언더스코어 prefix) — 서버 정렬·컬럼 지속성 설정과 충돌하지 않는 임의 키.
- **`canEdit() && viewType() === "page"` 조건부**: modal 뷰 / 권한 없음이면 열 자체 숨김. `canEdit`은 이미 page 한정이지만 명시적으로 표기하면 의도가 분명.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md)
