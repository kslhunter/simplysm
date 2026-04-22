← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 F: 복합 상세 (내부 `<sd-sheet>`)

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md)

확장 A(편집/저장)를 전제로, 상세 폼 안에 **하위 컬렉션**(박스 목록, 품목 라인 등)을 편집하는 구조를 도입한다. `<sd-form>` 본문 내부에 `<sd-sheet>`를 중첩하고, 하위 컬렉션의 행 추가·수정·삭제는 `item.isDeleted = true` 플래그로 표현하여 `oneWayDiffs` 기반 일괄 저장에 포함시킨다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdAnchor`(하위 행 삭제/복구 아이콘 호스트), `Uuid`, `oneWayDiffs`(side-effect import), 아이콘 `tablerCirclePlus` / `tablerEraser` / `tablerRestore` (`mark`는 확장 A에서 이미 도입)
- **데이터 타입 확장:** `ICustomer.boxes: ICustomerBox[]` + `interface ICustomerBox { id: string; seq: number; note: string; isDeleted: boolean; }`
- **data 초기값:** `boxes: []` 필드 추가
- **시트 함수 (클래스 필드):** `boxTrackByFn`, `getBoxCellStyleFn`
- **메서드:** `onAddBoxButtonClick`, `onToggleDeleteBoxButtonClick`
- **템플릿:** main 영역 `<sd-form>` 내부를 [상단 단일 필드 블록 + 하위 컬렉션 도구 dock(`<sd-button>` "박스 추가") + 하위 `<sd-sheet>` 중첩] 구조로 교체
- **onSubmit 변경:** `_sdToast.try(...)` 블록 내부를 diff 계산(`data().boxes.oneWayDiffs(_dataSnapshot?.boxes, "id")`) + 일괄 제출로 교체

> 상세: [`<sd-sheet>`](../../ui-data/sd-sheet.md) · [`<sd-sheet-column>`](../../ui-data/sd-sheet.md#sdsheetcolumn) · [`[cell]`](../../ui-data/sd-sheet.md#sdsheetcolumncelltemplate) · [`<sd-anchor>`](../../ui-form/sd-anchor.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A) 위에 번호 순서대로 삽입·교체할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 추가 — @simplysm/angular에 {SdSheet, SdSheetColumn, SdSheetColumnCellTemplate, SdAnchor} 추가.
//    @simplysm/core-common에서 {Uuid} 추가 + 프로토타입 확장 활성화용 side-effect import.
//    아이콘에 tablerCirclePlus / tablerEraser / tablerRestore 추가. (mark는 확장 A에서 이미 import됨)
import { SdSheet, SdSheetColumn, SdSheetColumnCellTemplate, SdAnchor } from "@simplysm/angular";
import { Uuid } from "@simplysm/core-common";
import { tablerCirclePlus, tablerEraser, tablerRestore } from "@ng-icons/tabler-icons";
import "@simplysm/core-common";  // Array.prototype.oneWayDiffs 활성화 (side-effect import)

// 2) 데이터 타입 확장 — 진입점 3.1 최소 뼈대의 ICustomer에 boxes 필드만 추가, ICustomerBox 신설
//    (확장 B를 함께 적용하면 ICustomer.isDeleted 필드가 별도로 들어가며, 본 확장 단독 적용에는 포함되지 않는다)
interface ICustomer {
  id: number | undefined;
  name: string;
  phone: string;
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

// 3) data 초기값에 boxes: [] 추가 — 진입점 3.1 최소 뼈대의 data = signal<ICustomer>({ ... }) 초기값에 포함

// 4) template — main 영역(<sd-dock-container> 안쪽 <sd-form> 내부)을
//    [단일 필드 + 도구 dock + 시트]로 교체. 최종수정 표시 블록은 최소 뼈대와 동일.
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
  <!-- 최종수정 표시는 최소 뼈대와 동일 -->
</div>

// 5) 시트 함수 (클래스 필드) 추가
protected readonly boxTrackByFn = (item: ICustomerBox): string => item.id;

protected readonly getBoxCellStyleFn = (item: ICustomerBox): string | undefined =>
  item.isDeleted ? "text-decoration: line-through;" : undefined;

// 6) 메서드 추가
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

// 7) onSubmit의 _sdToast.try(...) 블록 내부 교체 — diff 계산 + 일괄 제출
await this._sdToast.try(async () => {
  // 삭제 플래그가 섞여 있으면 사용자 확인
  if (this.data().boxes.some((b) => b.isDeleted)) {
    if (!confirm("삭제 표시된 박스가 있습니다. 정말 저장하시겠습니까?")) return;
  }

  // 하위 컬렉션 diff 계산 — 반환 type은 "create" | "update" | "same" 3종
  const snapshotBoxes = this._dataSnapshot?.boxes ?? [];
  const boxDiffs = this.data().boxes.oneWayDiffs(snapshotBoxes, "id");

  // 앱별 ORM 호출:
  //   await this._appOrm.connectAsync(async (db) => {
  //     await db.customer().where((c) => [expr.eq(c.id, this.data().id)])
  //       .upsert(() => ({ name: this.data().name, phone: this.data().phone }));
  //     for (const d of boxDiffs) {
  //       if (d.type === "create") {
  //         await db.customerBox().insert({ ...d.item, customerId: this.data().id! });
  //       } else if (d.type === "update") {
  //         await db.customerBox().where((c) => [expr.eq(c.id, d.item.id)])
  //           .update(() => d.item);
  //       }
  //     }
  //   });

  this._sdToast.success("저장되었습니다.");
  // 확장 C(modal 뷰)가 함께 적용된 경우에만 존재: this.close.emit(true); — modal 호출 측에 결과 전달
  await this._refresh();
});
```

**포인트:**

- **하위 컬렉션의 삭제는 `isDeleted: true` 플래그로 표현한다.** 이것은 상위 테이블의 삭제 방식([공통 규칙: 삭제 방식](../_common-rules.md#삭제-방식은-db-스키마에-따라-결정한다))과 **무관**하게, `oneWayDiffs`가 `"delete"` 타입을 지원하지 않기 때문에 하위 컬렉션에서는 항상 이 방식을 사용한다. 반환 `type`은 `"create" | "update" | "same"` 3종뿐이다(`packages/core-common/src/extensions/arr-ext.types.ts:206`). 서버는 `isDeleted: true` row를 soft-delete 또는 물리 삭제로 처리한다.
- **시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시 필수** — [공통 규칙: 시트 셀 `[inset]/[size]`](../_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다).
- **`data().boxes.push(newBox)` 같은 배열 mutation 후에는 `mark(this.data)`로 signal 참조를 갱신한다** — OnPush 템플릿 재렌더링·연계 computed 갱신 용도의 **통지**이며, 값 비교(저장 감지)와는 별개다: [공통 규칙: `mark(sig)`…](../_common-rules.md#marksig를-저장-감지-수단으로-사용하지-않는다).
- **`id`는 클라이언트에서 UUID로 생성** — `Uuid.generate().toString()`으로 문자열 key를 만들어 `trackByFn` + `oneWayDiffs`의 key로 사용한다. 서버가 발급한 PK가 별도로 있다면 별도 컬럼으로 관리하고 클라이언트 UUID는 row 식별자로만 쓴다.
- **삭제 플래그 혼재 시 `confirm`** — `this.data().boxes.some((b) => b.isDeleted)`이면 저장 직전 사용자 확인을 요청한다.

**🚫 흔한 실수**

> 공통 규칙(시트 셀 `[inset]/[size]`, `mark` 오용, 상위 테이블 soft-delete 선택 기준)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 이 섹션은 **복합 상세(하위 컬렉션) 확장 고유 실수**만 다룬다.

### `data().boxes`에서 기존 row를 물리 제거한다

```typescript
// ❌ 기존 row를 하위 컬렉션 배열에서 제거 — oneWayDiffs는 delete를 반환하지 않으므로
//    저장 시 서버는 이 row가 사라진 사실을 감지하지 못한다.
onRemoveBox(box: ICustomerBox): void {
  this.data.update((d) => ({
    ...d,
    boxes: d.boxes.filter((b) => b.id !== box.id),
  }));
}

// ✅ 삭제 의사는 isDeleted 플래그로 표현 → diff의 type: "update"로 전송
onToggleDeleteBoxButtonClick(box: ICustomerBox): void {
  box.isDeleted = !box.isDeleted;
  mark(this.data);  // OnPush 재렌더링 통지
}

// ✅ 예외: 신규 row(snapshot에 없는 클라이언트 UUID)는 저장 포기 시 물리 제거해도 된다
//    — snapshot에 존재하지 않으므로 diff 자체가 발생하지 않는다.
onCancelNewBox(box: ICustomerBox): void {
  this.data.update((d) => ({
    ...d,
    boxes: d.boxes.filter((b) => b.id !== box.id),
  }));
}
```

**근거**: `oneWayDiffs`의 반환 `type`은 `"create" | "update" | "same"` 3종뿐이며 delete를 다루지 않는다(`packages/core-common/src/extensions/arr-ext.types.ts:206`). 기존 row를 화면에서 제거하면 diff가 발생하지 않아 서버 저장 경로를 우회한다. 하위 컬렉션 삭제는 상위 테이블의 soft-delete 여부와 무관하게 항상 `isDeleted` 플래그를 쓴다 — [공통 규칙: 삭제 방식](../_common-rules.md#삭제-방식은-db-스키마에-따라-결정한다)은 상위 테이블 단위 결정이며, 하위 컬렉션은 `oneWayDiffs` delete 미지원이라는 기술적 제약이 원인이다.
