← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 D: control 뷰

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md) + [확장 B: 삭제/복구 토글](./extension-b-delete-restore.md)

확장 A(편집/저장) + 확장 B(삭제/복구)를 전제로, 동일 컴포넌트를 **control 뷰**(마스터-디테일의 디테일 영역)로도 재사용한다. 마스터 화면이 `<app-customer-detail [itemId]="selectedId()" class="flex-fill">`처럼 컴포넌트 selector를 직접 삽입하면 `viewType() === "control"`로 자동 판정되어, 상단 바에 저장·새로고침·삭제·복구 버튼이 가로로 배치된다. page 뷰의 topbar가 없고 modal 뷰의 하단 바가 없는 대신, main 영역 위에 `<sd-dock>` 상단 바가 놓인다.

**이 확장이 도입하는 요소:**

- **imports:** [확장 C](./extension-c-modal-view.md)에서 이미 도입된 `injectViewTypeSignal`, `SdDockContainer`, `SdDock`, `tablerDeviceFloppy`, `tablerRefresh`, `tablerEraser`, `tablerRestore`를 재사용. 확장 D를 확장 C 없이 단독 적용하는 경우 동일 imports를 신규 도입
- **파생:** `viewType = injectViewTypeSignal()` (확장 C 없이 단독 적용 시 신규 도입)
- **템플릿 추가:** [확장 C](./extension-c-modal-view.md)가 도입한 `<sd-dock-container>` 내부에 `@if (viewType() === "control" && canEdit())` 블록으로 `<sd-dock>` 상단 바(저장·새로고침·삭제·복구) 추가 — 확장 C의 modal 하단 바 블록과 나란히 배치

> 상세: [`injectViewTypeSignal`](../../utils/inject-routing-signals.md#injectviewtypesignal)

> 상세: [`<sd-dock> position 기본 "top"`](../../ui-layout/sd-dock.md)

```typescript
// 1) imports 추가 (확장 D를 확장 C 없이 단독 적용하는 경우)
import { injectViewTypeSignal, SdDock, SdDockContainer } from "@simplysm/angular";

// 2) 파생 추가 (확장 C 없이 단독 적용 시)
protected readonly viewType = injectViewTypeSignal();

// 3) template — <sd-dock-container> 내부(확장 C 블록과 나란히)에 control 뷰 상단 바 추가
template: `
  <sd-dock-container>
    <!-- control 뷰 상단 바: 저장·새로고침·삭제·복구 -->
    @if (viewType() === "control" && canEdit()) {
      <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
        <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
          <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
        </sd-button>
        <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
          <ng-icon [svg]="tablerRefresh" /> 새로고침 <small>(CTRL+ALT+L)</small>
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

- **control 뷰 = 마스터-디테일의 디테일 영역**. 마스터 화면이 `<app-customer-detail [itemId]="selectedId()" class="flex-fill">`처럼 직접 삽입하여 좌측 리스트 선택에 따라 우측에 상세 폼을 표시한다. `injectViewTypeSignal()`은 `ActivatedRoute.component`의 selector와 호스트 `tagName`이 **다를 때** control로 판정한다(page는 일치, modal은 `SdActivatedModalProvider` 주입 시 우선).
- **상단 바는 `[position]` 생략** — `<sd-dock>`의 `[position]` 기본값이 `"top"`이므로 명시하지 않는다. modal 하단 바와 달리 기본 동작을 그대로 쓴다.
- **[확장 C](./extension-c-modal-view.md)(modal 뷰)와 병행 가능** — 두 분기 블록(`@if (viewType() === "control")` / `@if (viewType() === "modal")`)이 상호 배타이므로 같은 `<sd-dock-container>` 내부에 나란히 둬도 안전하다. [부록 B 확장 매트릭스 표](../crud-detail.md#부록-b-확장-매트릭스-표)가 이 조합이다.
- **control 뷰에서는 `setupCanDeactivate`가 아무 동작 하지 않는다** — 라우트 guard도 모달 canDeactivateFn도 연결되지 않는다(`packages/angular/src/core/utils/setups/setupCanDeactivate.ts:5`). 마스터 화면이 이동할 때의 이탈 확인은 마스터 화면이 자체적으로 처리한다.
