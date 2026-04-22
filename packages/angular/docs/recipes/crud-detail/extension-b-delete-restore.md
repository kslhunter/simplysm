← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 B: 삭제/복구 토글

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md)

확장 A(편집/저장)를 전제로, 기존 레코드에 대한 **soft-delete 토글**(삭제/복구 버튼)을 추가한다. 도메인 타입에 `isDeleted: boolean` 필드를 추가하고, 삭제·복구 버튼은 최소 뼈대의 topbar에 `@if (!isNew() && canEdit())` 조건으로 배치한다. 뷰별 UI(modal 하단 바 / control 상단 바의 삭제 버튼)는 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)에서 추가로 처리한다.

**이 확장이 도입하는 요소:**

- **imports:** `tablerEraser`, `tablerRestore`
- **타입 확장:** `ICustomer.isDeleted: boolean` 필드 추가 + `data` 초기값·`_refresh` 빈 객체에 `isDeleted: false` 추가
- **메서드:** `onDeleteButtonClick`, `onRestoreButtonClick`, `_toggleDelete(del: boolean)`
- **템플릿:** 최소 뼈대 topbar 내부(`canEdit()` 저장 버튼과 새로고침 버튼 사이)에 `@if (!isNew() && canEdit())` 블록으로 삭제·복구 버튼 추가

```typescript
// 1) imports 추가
import {
  tablerAlertTriangle, tablerDeviceFloppy, tablerEraser, tablerRefresh, tablerRestore,
} from "@ng-icons/tabler-icons";

// 2) ICustomer 확장 — isDeleted 필드 추가
interface ICustomer {
  id: number | undefined;
  name: string;
  phone: string;
  isDeleted: boolean;     // ← 추가
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}

// 3) data 초기값·_refresh 빈 객체에 isDeleted: false 추가
protected readonly data = signal<ICustomer>({
  id: undefined, name: "", phone: "",
  isDeleted: false,       // ← 추가
  lastModifiedAt: undefined, lastModifiedBy: undefined,
});

// 4) template — topbar에 삭제·복구 버튼 추가 (저장 버튼 뒤, 새로고침 버튼 앞)
template: `
  <sd-topbar>
    <h4>{{ viewTitle() }}</h4>
    @if (canEdit()) {
      <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()"> <!-- 저장 (확장 A) --> </sd-button>
    }
    @if (!isNew() && canEdit()) {
      @if (data().isDeleted) {
        <sd-button [theme]="'link-warning'" (click)="onRestoreButtonClick()">
          <ng-icon [svg]="tablerRestore" /> 복구
        </sd-button>
      } @else {
        <sd-button [theme]="'link-danger'" (click)="onDeleteButtonClick()">
          <ng-icon [svg]="tablerEraser" /> 삭제
        </sd-button>
      }
    }
    <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()"> <!-- 새로고침 --> </sd-button>
  </sd-topbar>
`

// 5) 메서드 추가
protected async onDeleteButtonClick(): Promise<void> {
  await this._toggleDelete(true);
}

protected async onRestoreButtonClick(): Promise<void> {
  await this._toggleDelete(false);
}

private async _toggleDelete(del: boolean): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("edit")) return;
  if (del && !confirm("삭제하시겠습니까?")) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 앱별 ORM delete/restore — 예:
    //   await this._appOrm.connectAsync(async (db) => {
    //     await db.customer.where(...).update({ isDeleted: del });
    //   });

    this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

// 6) 아이콘 추가
protected readonly tablerEraser = tablerEraser;
protected readonly tablerRestore = tablerRestore;
```

**포인트:**

- **삭제는 `isDeleted: true` 플래그 업데이트 soft-delete**로 구현한다. 물리 삭제(row delete)를 쓰지 않는다 — 복구 기능·감사 이력·참조 무결성을 유지하기 위함. 서버는 `isDeleted: true` 레코드를 조회에서 기본 제외하고, 상세 폼에서는 복구 버튼으로 토글할 수 있다.
- **삭제 confirm은 `_toggleDelete`에서 `del === true`일 때만** 호출한다. 복구는 확인 없이 즉시 수행.
- **`isNew()` 신규 상태에서는 삭제·복구 버튼 노출 안 함** — DB에 저장되지 않은 레코드는 삭제 대상이 없으므로 `@if (!isNew() && canEdit())`로 감싼다.
- **모달/컨트롤 뷰의 삭제 버튼은 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)에서 별도 배치** — topbar가 없는 뷰에서는 이 확장만으로는 삭제 UI가 보이지 않는다. [확장 C](./extension-c-modal-view.md)(modal 하단 바) / [확장 D](./extension-d-control-view.md)(control 상단 바)에서 동일 `_toggleDelete` 메서드를 재사용하여 배치한다.
