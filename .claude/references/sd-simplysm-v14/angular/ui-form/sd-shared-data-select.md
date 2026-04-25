# `SdSharedDataSelect`

> **읽어야 하는 상황**: 공유 데이터에서 드롭다운으로 항목을 선택할 때. 모달 선택은 [sd-shared-data-components.md](../features/sd-shared-data-components.md) 참조.

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

