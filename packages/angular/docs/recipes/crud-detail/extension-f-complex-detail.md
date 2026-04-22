← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 F: 복합 상세 (내부 `<sd-sheet>`)

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md)

확장 A(편집/저장)를 전제로, 상세 폼 안에 **하위 컬렉션**(박스 목록, 품목 라인 등)을 편집하는 구조를 도입한다. `<sd-form>` 본문 내부에 `<sd-sheet>`를 중첩하고, 하위 컬렉션의 행 추가·수정·삭제는 `item.isDeleted = true` 플래그로 soft-delete하여 `ArrayOneWayDiffResult` 기반 일괄 저장에 포함시킨다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdAnchor`(신규 행 삭제 아이콘), `mark`, `Uuid`, `oneWayDiffs`(side-effect import), `tablerCirclePlus`
- **데이터 타입 확장:** `ICustomer.boxes: ICustomerBox[]` + `interface ICustomerBox { id: string; seq: number; note: string; isDeleted: boolean; }`
- **시트 함수 (클래스 필드):** `boxTrackByFn`, `getBoxCellStyleFn`
- **메서드:** `onAddBoxButtonClick`, `onToggleDeleteBoxButtonClick`
- **템플릿:** main 영역 `<sd-form>` 내부에 하위 컬렉션 도구 영역(`<sd-button>` "박스 추가") + `<sd-sheet>` 중첩 (§3 최소 뼈대의 `<sd-form>` 내부 단일 필드 블록 아래에 추가)
- **onSubmit 변경:** `_sdToast.try(...)` 블록 내부를 diff 계산(`data().boxes.oneWayDiffs(_snapshot?.boxes, "id")`) + 일괄 제출로 교체

> 상세: [`<sd-sheet>`](../../ui-data/sd-sheet.md) · [`<sd-sheet-column>`](../../ui-data/sd-sheet.md#sdsheetcolumn) · [`[cell]`](../../ui-data/sd-sheet.md#sdsheetcolumncelltemplate) · [`<sd-anchor>`](../../ui-form/sd-anchor.md) · [`mark`](../../utils/mark.md)

```typescript
// 1) imports 추가
import { SdSheet, SdSheetColumn, SdSheetColumnCellTemplate, SdAnchor, mark } from "@simplysm/angular";
import { Uuid } from "@simplysm/core-common";
import { tablerCirclePlus } from "@ng-icons/tabler-icons";
import "@simplysm/core-common";  // Array.prototype.oneWayDiffs 프로토타입 확장 (side-effect import)

// 2) 데이터 타입 확장
interface ICustomer {
  id: number | undefined;
  name: string;
  phone: string;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
  boxes: ICustomerBox[];  // 하위 컬렉션 추가
}

interface ICustomerBox {
  id: string;  // 클라이언트 생성 UUID (서버 저장 시 교체 가능)
  seq: number;
  note: string;
  isDeleted: boolean;
}

// 3) template — main 영역(<sd-dock-container> 안쪽, <sd-form> 내부) 단일 필드 아래에
//    하위 컬렉션 도구·시트 중첩. §3 최소 뼈대의 main 영역을 다음 구조로 교체:
<div class="flex-column fill">
  <sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-fill flex-column">
    <!-- 상단 단일 필드 -->
    <div class="p-default">
      <table class="form-table">
        <tbody>
          <tr>
            <th>명칭</th>
            <td>
              <sd-textfield
                [type]="'text'"
                [required]="true"
                [disabled]="!canEdit()"
                [(value)]="data().name"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 하위 컬렉션 도구 영역 -->
    @if (canEdit()) {
      <div class="flex-row gap-sm p-xs-default">
        <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddBoxButtonClick()">
          <ng-icon [svg]="tablerCirclePlus" />
          박스 추가
        </sd-button>
      </div>
    }

    <!-- 하위 컬렉션 시트 -->
    <div class="flex-fill">
      <sd-sheet
        [items]="data().boxes"
        [trackByFn]="boxTrackByFn"
        [getItemCellStyleFn]="getBoxCellStyleFn"
      >
        @if (canEdit()) {
          <sd-sheet-column [fixed]="true" [key]="'_isDeleted'">
            <ng-template #headerTpl>
              <div class="p-xs-sm tx-center">
                <ng-icon [svg]="tablerEraser" />
              </div>
            </ng-template>
            <ng-template [cell]="data().boxes" let-item="item">
              <div class="p-xs-sm tx-center">
                <sd-anchor
                  [theme]="'danger'"
                  (click)="onToggleDeleteBoxButtonClick(item)"
                >
                  <ng-icon [svg]="item.isDeleted ? tablerRestore : tablerEraser" />
                </sd-anchor>
              </div>
            </ng-template>
          </sd-sheet-column>
        }
        <sd-sheet-column [key]="'seq'" [header]="'박스#'">
          <ng-template [cell]="data().boxes" let-item="item">
            <sd-textfield
              [type]="'number'"
              [required]="true"
              [disabled]="!canEdit()"
              [(value)]="item.seq"
              [inset]="true"
              [size]="'sm'"
            />
          </ng-template>
        </sd-sheet-column>
        <sd-sheet-column [key]="'note'" [header]="'비고'">
          <ng-template [cell]="data().boxes" let-item="item">
            <sd-textfield
              [type]="'text'"
              [disabled]="!canEdit()"
              [(value)]="item.note"
              [inset]="true"
              [size]="'sm'"
            />
          </ng-template>
        </sd-sheet-column>
      </sd-sheet>
    </div>
  </sd-form>
  <!-- 최종수정 표시는 §3 최소 뼈대와 동일 -->
</div>

// 4) 메서드 추가
protected readonly boxTrackByFn = (item: ICustomerBox): string => item.id;

protected readonly getBoxCellStyleFn = (item: ICustomerBox): string | undefined =>
  item.isDeleted ? "text-decoration: line-through;" : undefined;

protected onAddBoxButtonClick(): void {
  const newBox: ICustomerBox = {
    id: Uuid.generate().toString(),
    seq: (this.data().boxes.at(-1)?.seq ?? 0) + 1,
    note: "",
    isDeleted: false,
  };
  this.data().boxes.push(newBox);
  mark(this.data);
}

protected onToggleDeleteBoxButtonClick(item: ICustomerBox): void {
  item.isDeleted = !item.isDeleted;
  mark(this.data);
}

// 5) onSubmit의 `_sdToast.try(...)` 블록 내부를 아래로 교체 — diff 계산 + 일괄 제출
await this._sdToast.try(async () => {
  // 삭제 플래그가 섞여 있으면 confirm
  if (this.data().boxes.some((b) => b.isDeleted)) {
    if (!confirm("삭제 표시된 박스가 있습니다. 정말 저장하시겠습니까?")) return;
  }

  // 하위 컬렉션 diff 계산 — `type: "create" | "update" | "same"`
  const snapshotBoxes = this._snapshot?.boxes ?? [];
  const boxDiffs = this.data().boxes.oneWayDiffs(snapshotBoxes, "id");

  // 앱별 ORM 호출:
  //   await this._appOrm.connectAsync(async (db) => {
  //     await db.customer.upsertAsync(this.data());
  //     for (const d of boxDiffs) {
  //       if (d.type === "create") await db.customerBox.insertAsync(d.target);
  //       else if (d.type === "update") await db.customerBox.updateAsync(d.target);
  //     }
  //   });

  this._sdToast.success("저장되었습니다.");
  this.close.emit(true);     // 확장 C가 함께 적용된 경우 — modal 호출 측에 결과 전달
  await this._refresh();
});
```

**포인트:**

- 하위 컬렉션의 **삭제는 `isDeleted: true` 플래그로 표현**한다. `data().boxes`에서 row를 물리적으로 제거하면 `oneWayDiffs`가 해당 row를 감지하지 못한다 (`oneWayDiffs`는 `type: "create" | "update" | "same"`만 반환, **`"delete"` 없음**). 서버가 soft-delete 처리.
- 시트 셀 내부 컨트롤은 **`[inset]="true" [size]="'sm'"` 명시 필수** ([진입점 §13 규칙 1](../crud-detail.md#규칙-1-시트-셀-내부-컨트롤은-insettrue-sizesm-명시) 참조).
- `data().boxes.push(newBox)` 같은 배열 mutation 후에는 `mark(this.data)`로 signal 참조를 갱신해야 OnPush 템플릿이 재렌더링된다([진입점 §13 규칙 2](../crud-detail.md#규칙-2-marksig는-저장-감지가-아니라-ui-동기화) 참조).
- `id`는 **클라이언트에서 UUID로 생성**하여 `trackByFn` + `oneWayDiffs`의 key로 사용. 서버가 발급한 PK가 별도로 있다면 별도 컬럼으로 관리하고 클라이언트 UUID는 row 식별자로만 사용.
