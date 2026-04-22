# `SdSharedDataSelect`

공유 데이터 드롭다운 선택 컴포넌트. 검색 기능 포함. 상세 API는 [features/sd-shared-data-components.md](../features/sd-shared-data-components.md#sdshareddataselect)를 참조한다.

## 시트 셀 내 사용 패턴

시트 셀 안에서 사용할 때 `[inset]="true" [size]="'sm'"`을 반드시 지정한다.

```html
<sd-sheet-column [header]="'거래처'" [key]="'vendorId'">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-shared-data-select
      [items]="sharedVendors()"
      [inset]="true"
      [size]="'sm'"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.vendorId"
      (valueChange)="mark(items)"
    >
      <ng-template [itemOf]="sharedVendors()">
        <div class="flex-row gap-sm">
          <div>{{ item.__searchText }}</div>
        </div>
      </ng-template>
    </sd-shared-data-select>
  </ng-template>
</sd-sheet-column>
```

## 일반 form 내 사용 패턴

```html
<sd-shared-data-select
  [items]="sharedVendors()"
  [(value)]="data().vendorId"
  (valueChange)="mark(data)"
>
  <ng-template [itemOf]="sharedVendors()">
    <div class="flex-row gap-sm">
      <div>{{ item.__searchText }}</div>
    </div>
  </ng-template>
</sd-shared-data-select>
```

`<ng-template [itemOf]>` 패턴으로 드롭다운 항목의 표시 형식을 커스터마이징한다.

### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — 시트 셀 내 공유 데이터 선택
- [crud-detail.md §9 확장 E: 보조 기능 영역](../recipes/crud-detail.md#9-확장-e-보조-기능-영역) — 보조 form 셀렉터
