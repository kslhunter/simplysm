← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 D: control 뷰

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md) + [확장 B: 삭제/복구 토글](./extension-b-delete-restore.md)

확장 A(편집/저장) + 확장 B(삭제/복구)를 전제로, 동일 컴포넌트를 **control 뷰**(마스터-디테일의 디테일 영역)로도 재사용한다. 마스터 화면이 `<app-customer-detail [itemId]="selectedId()" class="flex-fill">`처럼 컴포넌트 selector를 직접 삽입하면 `viewType() === "control"`로 자동 판정되어, 상단 바에 저장·삭제·복구 버튼이 가로로 배치된다. page 뷰의 topbar가 없고 modal 뷰의 하단 바가 없는 대신, main 영역 위에 `<sd-dock>` 상단 바가 놓인다.

**이 확장이 도입하는 요소:**

- **imports:** [확장 C](./extension-c-modal-view.md)에서 이미 도입된 `injectViewTypeSignal`, `SdDockContainer`, `SdDock`, `tablerDeviceFloppy`, `tablerEraser`, `tablerRestore`를 재사용. 확장 D를 확장 C 없이 단독 적용하는 경우 동일 imports를 신규 도입. `output` (`@angular/core`)
- **파생:** `viewType = injectViewTypeSignal()` (확장 C 없이 단독 적용 시 신규 도입)
- **output:** `submitted = output<boolean>()` — 저장/삭제/상태 변경 등 데이터 변경 성공 시 부모에게 목록 갱신을 알리는 신호. 확장 C의 `close` output(SdModalContentDef 계약, modal 닫기 결과)과는 **별개**
- **템플릿 추가:** [확장 C](./extension-c-modal-view.md)가 도입한 `<sd-dock-container>` 내부에 `@if (viewType() === "control" && canEdit())` 블록으로 `<sd-dock>` 상단 바(저장·삭제·복구) 추가 — 확장 C의 modal 하단 바 블록과 나란히 배치

> 상세: [`injectViewTypeSignal`](../../utils/inject-routing-signals.md#injectviewtypesignal)

> 상세: [`<sd-dock> position 기본 "top"`](../../ui-layout/sd-dock.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A+B) 위에 번호 순서대로 삽입할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 추가 (확장 D를 확장 C 없이 단독 적용하는 경우)
import { injectViewTypeSignal, SdDock, SdDockContainer } from "@simplysm/angular";

// 2) 파생 + output 추가 (확장 C 없이 단독 적용 시)
protected readonly viewType = injectViewTypeSignal();

// control 뷰에서 부모(마스터 시트)에게 "데이터 변경됨 → 목록 갱신 필요"를 알리는 output.
// 확장 C의 close output(SdModalContentDef 계약, modal 닫기 결과)과는 별개다.
submitted = output<boolean>();

// 3) onSubmit / _toggleDelete 성공 경로에 submitted.emit(true) 추가
protected async onSubmit(): Promise<void> {
  // ... (ORM upsert)
  this._sdToast.success("저장되었습니다.");
  await this._refresh();
  this.submitted.emit(true);     // ← 추가
}

private async _toggleDelete(del: boolean): Promise<void> {
  // ... (ORM delete/restore)
  this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
  this.submitted.emit(true);     // ← 추가
}

// 4) 부모(마스터 시트)에서의 사용
// <app-customer-detail [itemId]="selectedId()" (submitted)="headerSheet.doRefresh()" class="flex-fill" />

// 5) template — <sd-dock-container> 내부(확장 C 블록과 나란히)에 control 뷰 상단 바 추가
template: `
  <sd-dock-container>
    <!-- control 뷰 상단 바: 저장·삭제·복구 -->
    @if (viewType() === "control" && canEdit()) {
      <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
        <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
          <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
        </sd-button>
        @if (!isNew() && canEdit()) {
          @if (data().isDeleted) {
            <sd-button [theme]="'warning'" (click)="onRestoreButtonClick()">
              <ng-icon [svg]="tablerRestore" /> 복구
            </sd-button>
          } @else {
            <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
              <ng-icon [svg]="tablerEraser" /> 삭제
            </sd-button>
          }
        }
      </sd-dock>
    }

    @if (viewType() === "modal" && canEdit()) {
      <!-- modal 하단 바 (확장 C) -->
    }

    <!-- main: form + 최종수정 (확장 A/B 동일) -->
  </sd-dock-container>
`
```

**포인트:**

- **`submitted` output으로 부모 목록을 갱신한다.** 저장·삭제·복구·상태 변경 등 데이터 변경이 성공하면 `this.submitted.emit(true)`로 부모 마스터 시트에 목록 갱신을 알린다. 부모는 `(submitted)="headerSheet.doRefresh()"`로 수신한다. 확장 C의 `close` output(SdModalContentDef 계약, modal 닫기 결과 반환)과는 **별개**의 output이다.
- **control 뷰 = 마스터-디테일의 디테일 영역**. 마스터 화면이 `<app-customer-detail [itemId]="selectedId()" (submitted)="headerSheet.doRefresh()" class="flex-fill">`처럼 직접 삽입하여 좌측 리스트 선택에 따라 우측에 상세 폼을 표시한다. `injectViewTypeSignal()`은 `ActivatedRoute.component`의 selector와 호스트 `tagName`이 **다를 때** control로 판정한다(page는 일치, modal은 `SdActivatedModalProvider` 주입 시 우선).
- **상단 바는 `[position]` 생략** — `<sd-dock>`의 `[position]` 기본값이 `"top"`이므로 명시하지 않는다. modal 하단 바와 달리 기본 동작을 그대로 쓴다.
- **[확장 C](./extension-c-modal-view.md)(modal 뷰)와 병행 가능** — 두 분기 블록(`@if (viewType() === "control")` / `@if (viewType() === "modal")`)이 상호 배타이므로 같은 `<sd-dock-container>` 내부에 나란히 둬도 안전하다. [변형 확장 A~F 인덱스](../crud-detail.md#변형-확장-a-f-인덱스)가 이 조합을 수용한다.
- **control 뷰에서는 `setupCanDeactivate`가 아무 동작 하지 않는다** — 라우트 guard도 모달 canDeactivateFn도 연결되지 않는다(`packages/angular/src/core/routing/setupCanDeactivate.ts:10-26`). 마스터 화면이 이동할 때의 이탈 확인은 마스터 화면이 자체적으로 처리한다.

## 🚫 흔한 실수 (Anti-patterns)

> 공통 규칙(topbar 소유권, `mark` 오용, `setupCanDeactivate` 호출 위치 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 이 섹션은 **control 뷰 확장 고유 실수**만 다룬다.

### control 뷰 분기에 자체 `<sd-topbar>`를 추가한다

```typescript
// ✅ control 분기에는 <sd-dock> 상단 바만 둔다. page가 소유한 topbar와
//    중첩되지 않으며, 저장/삭제/복구 버튼을 가로로 배치한다.
@if (viewType() === "control" && canEdit()) {
  <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
      <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
    </sd-button>
    <!-- 삭제/복구는 @if (!isNew() && canEdit()) 블록으로 (확장 B 조건 재사용) -->
  </sd-dock>
}
```

**근거**: control 뷰는 마스터 화면이 `<app-customer-detail [itemId]="..." />`처럼 디테일 영역으로 직접 삽입하는 구조다. 마스터 화면은 이미 `<sd-topbar-container>`와 `<sd-topbar>`를 소유하므로, 내부 컴포넌트가 동일 구조를 중첩하면 타이틀·액션 영역이 이중으로 렌더링되어 레이아웃이 깨진다. control 분기의 상단 액션 영역은 `<sd-dock-container>` 내부 `<sd-dock>`으로 구성한다. → [공통 규칙: page 컴포넌트가 `<sd-topbar-container>`와 `<sd-topbar>`를 소유한다](../_common-rules.md#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다)
