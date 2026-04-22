← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 C: modal 뷰

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md) + [확장 B: 삭제/복구 토글](./extension-b-delete-restore.md)

확장 A(편집/저장) + 확장 B(삭제/복구)를 전제로, 동일 컴포넌트를 **modal 뷰**로도 재사용한다. `SdModalProvider.showAsync`로 띄우면 `viewType() === "modal"`로 자동 판정되며, 기존 `<sd-topbar>`를 `@if (viewType() === "page") { ... }`로 래핑하여 page 뷰 전용으로 돌리고, 모달에는 하단 액션 바(확인·취소·삭제·복구)와 우측 상단 새로고침 아이콘을 추가한다. 모달은 `implements SdModalContentDef<boolean | undefined>`로 계약을 부착하여 호출 측이 저장/닫기 결과를 받을 수 있다.

**이 확장이 도입하는 요소:**

- **imports:** `output`, `TemplateRef`, `injectViewTypeSignal`, `type SdModalContentDef`, `SdActivatedModalProvider`, `SdAnchor`, `SdDockContainer`, `SdDock`
- **DI:** `_sdActivatedModal = inject(SdActivatedModalProvider, { optional: true })`
- **계약:** `implements SdModalContentDef<boolean | undefined>`, `close = output<boolean | undefined>()`, `actionTplRef?: TemplateRef<any>` (필드 선언만 — `SdModal`이 setter 프록시로 감쌈)
- **viewChild:** `_modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef })`
- **파생:** `viewType = injectViewTypeSignal()` (`viewTitle`은 이미 `injectViewTitleSignal()`로 modal/page 자동 분기됨)
- **생성자 effect:** `effect(() => { this.actionTplRef = this._modalActionTpl(); })` (모달 헤더 우측 액션 슬롯 브릿지)
- **setupCanDeactivate 조건 변경:** `() => this.viewType() === "modal" || this._checkIgnoreChanges()` — modal에서는 항상 true(이탈 허용)
- **onSubmit / `_toggleDelete` 변경:** 성공 경로에 `this.close.emit(true)` 추가
- **템플릿 교체 1:** 기존 `<sd-topbar>...</sd-topbar>`를 `@if (viewType() === "page") { <sd-topbar>...</sd-topbar> }`로 **래핑** (page 뷰 전용으로 돌림)
- **템플릿:** topbar 내부 `<h4>{{ viewTitle() }}</h4>` 및 권한 경고의 viewTitle은 그대로 유지 (`injectViewTitleSignal()`이 modal/page 자동 분기)
- **템플릿 추가:** `<sd-topbar-container>` 내부 main 래퍼(`<div class="flex-column fill">`)를 `<sd-dock-container>`로 감싸고, 그 내부에 `@if (viewType() === "modal" && canEdit())` 블록으로 `<sd-dock [position]="'bottom'">` 하단 액션 바(확인·취소·삭제·복구) 추가
- **템플릿 추가:** `<sd-busy-container>` 바깥에 `<ng-template #modalActionTpl>`로 모달 우측 상단 새로고침 아이콘 정의

> 상세: [`SdModalContentDef` 구현 패턴](../../provider-types/sd-modal-content-def.md#구현-패턴)

> 상세: [`SdActivatedModalProvider` 사용법](../../providers/sd-activated-modal-provider.md#usage)

> 상세: [`injectViewTypeSignal`](../../utils/inject-routing-signals.md#injectviewtypesignal)

> 상세: [`<sd-dock> position="bottom"`](../../ui-layout/sd-dock.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A+B) 위에 번호 순서대로 삽입·교체할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 추가
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
  TemplateRef, untracked, viewChild, ViewEncapsulation,
} from "@angular/core";
import {
  FormatPipe, injectPermsSignal,
  injectViewTitleSignal, injectViewTypeSignal,
  SdActivatedModalProvider, SdAnchor,
  SdBusyContainer, SdButton, SdCommandDirective,
  SdDock, SdDockContainer,
  SdForm, type SdModalContentDef,
  SdTextfield, SdToastProvider,
  SdTopbar, SdTopbarContainer, setupCanDeactivate,
} from "@simplysm/angular";

// 2) @Component imports 배열에 SdAnchor / SdDockContainer / SdDock 추가

// 3) DI 추가
private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });

// 4) 계약 부착 + viewChild + 파생 추가
export class CustomerDetail implements SdModalContentDef<boolean | undefined> {
  //== SdModalContentDef 요구 필드 ==
  close = output<boolean | undefined>();
  // actionTplRef는 SdModal이 setter 프록시로 감싸므로 필드 선언만으로 충분
  actionTplRef?: TemplateRef<any>;

  //== viewChild (modal 우측 상단 액션 브릿지) ==
  private readonly _modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef });

  //== 파생 ==
  protected readonly viewType = injectViewTypeSignal();
  // viewTitle은 최소 뼈대에서 이미 injectViewTitleSignal()로 선언됨 — modal/page 자동 분기

  // ... (이하 기존)
}

// 5) 생성자 — setupCanDeactivate 조건 변경 + actionTplRef effect 추가
constructor() {
  // 기존 초기 effect 동일...

  // 변경: setupCanDeactivate 조건에 viewType() === "modal" || 추가
  setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());

  // 추가: 모달 헤더 우측 액션 슬롯 브릿지 (control/page 뷰에선 _modalActionTpl이 렌더되지 않아 undefined)
  effect(() => {
    this.actionTplRef = this._modalActionTpl();
  });
}

// 6) onSubmit / _toggleDelete 성공 경로에 close.emit(true) 추가
protected async onSubmit(): Promise<void> {
  // ...
  await this._sdToast.try(async () => {
    // ... (ORM upsert)
    this._sdToast.success("저장되었습니다.");
    this.close.emit(true);     // ← 추가 — modal 호출 측이 결과를 받는다
    await this._refresh();
  });
  // ...
}

private async _toggleDelete(del: boolean): Promise<void> {
  // ...
  await this._sdToast.try(async () => {
    // ... (ORM delete/restore)
    this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
    this.close.emit(true);     // ← 추가
  });
  // ...
}

// 7) template — 기존 <sd-topbar>를 @if (viewType() === "page")로 래핑,
//    main 래퍼를 <sd-dock-container>로 감싸고
//    modal 하단 바 + <ng-template #modalActionTpl> 추가
template: `
  <sd-busy-container [busy]="busyCount() > 0">
    @if (initialized()) {
      @if (!perms().includes("use")) {
        <!-- '{{ viewTitle() }}'에 대한 사용권한이 없습니다. -->
      } @else {
        <sd-topbar-container>
          @if (viewType() === "page") {
            <sd-topbar>
              <h4>{{ viewTitle() }}</h4>
              <!-- 저장/삭제/복구/새로고침 (확장 A/B 동일) -->
            </sd-topbar>
          }

          <sd-dock-container>
            <!-- modal 하단 바: 확인/취소/삭제/복구 -->
            @if (viewType() === "modal" && canEdit()) {
              <sd-dock
                [position]="'bottom'"
                class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest"
              >
                @if (!isNew() && canEdit()) {
                  @if (data().isDeleted) {
                    <sd-button [size]="'sm'" [theme]="'warning'" (click)="onRestoreButtonClick()">
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [size]="'sm'" [theme]="'danger'" (click)="onDeleteButtonClick()">
                      삭제
                    </sd-button>
                  }
                }
                <div class="flex-fill flex-row gap-sm main-align-end">
                  <sd-button [size]="'sm'" [theme]="'gray'" (click)="close.emit(undefined)">
                    취소
                  </sd-button>
                  <sd-button [size]="'sm'" [theme]="'primary'" (click)="onSaveButtonClick()">
                    확인
                  </sd-button>
                </div>
              </sd-dock>
            }

            <!-- main: form + 최종수정 (확장 A/B 동일) -->
            <div class="flex-column fill"> ... </div>
          </sd-dock-container>
        </sd-topbar-container>
      }
    }
  </sd-busy-container>

  <!-- 모달 뷰에서만 사용되는 우측 상단 액션 템플릿.
       SdModalProvider가 contentComponent.actionTplRef를 setter 프록시로 감싸 SdModal로 브릿지한다.
       (packages/angular/src/core/modal/sd-modal.provider.ts:140-150) -->
  <ng-template #modalActionTpl>
    <sd-anchor
      [theme]="'gray'"
      class="p-sm-default"
      (click)="onRefreshButtonClick()"
      title="새로고침(CTRL+ALT+L)"
    >
      <ng-icon [svg]="tablerRefresh" />
    </sd-anchor>
  </ng-template>
`
```

**포인트:**

- **modal 하단 바는 `[position]="'bottom'"` 반드시 명시**(`packages/angular/src/layout/dock/sd-dock.ts:97`). 기본값이 `"top"`이라 누락하면 상단에 쌓여 topbar 뒤에 겹친다.
- **`actionTplRef` setter 프록시는 modal 뷰에서만 동작한다.** `SdModalProvider`는 모달 컨텐츠 컴포넌트 생성 시 `if ("actionTplRef" in contentRef.instance)`로 확인한 뒤 setter 프록시를 설치한다(`sd-modal.provider.ts:141`). page/control 뷰에서는 프록시가 설치되지 않으므로 `this.actionTplRef = ...` 할당이 인스턴스 필드에만 저장되고 부작용이 없다. `<ng-template #modalActionTpl>` 선언 자체는 뷰 타입과 무관하게 TemplateRef를 반환하지만, 소비할 `SdModal`이 없으므로 결과적으로 아무 일도 일어나지 않는다.
- **`setupCanDeactivate`는 modal에서 true를 돌려 항상 이탈 허용**한다 — modal 자체에 취소 버튼이 있으므로 이중 confirm을 피한다. 페이지 뷰에서는 `_checkIgnoreChanges()`의 confirm 결과로 제어.
- **modal 취소 버튼은 `close.emit(undefined)`**. 호출 측은 `undefined`를 "취소"로, `true`를 "저장/삭제 성공"으로 해석한다. boolean 대신 사용자 정의 결과 타입이 필요하면 `close = output<FooResult | undefined>()` + `implements SdModalContentDef<FooResult | undefined>`로 변경하고, 호출 측은 `const result = await sdModal.showAsync({ type: CustomerDetail, ... })`로 받는다.
- **`viewTitle` 우선순위**: 모달 컴포넌트의 `title()` input이 세팅되어 있으면 그것을 우선, 없으면 라우트 기반 타이틀을 사용. `_sdSystemLog.writeAsync("warn", ...)`로 실패 시 로그 남김.
- **[확장 D](./extension-d-control-view.md)(control 뷰)와 병행 가능** — 두 분기 블록(`@if (viewType() === "modal")` / `@if (viewType() === "control")`)이 상호 배타이므로 같은 `<sd-dock-container>` 내부에 나란히 둘 수 있다.

## 🚫 흔한 실수 (Anti-patterns)

> 공통 규칙(`mark` 오용, `setupCanDeactivate` / `injectViewTypeSignal()` 호출 위치, page 컴포넌트의 topbar 소유 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 이 섹션은 **modal 뷰 확장 고유 실수**만 다룬다.

### modal 하단 바의 `<sd-dock>`에 `[position]="'bottom'"`을 명시하지 않는다

```typescript
// ❌ [position] 생략 — 기본값이 "top"이라 하단 바가 <sd-dock-container>의 상단부터
//    쌓여 topbar 뒤에 겹치거나, topbar가 숨겨진 modal 뷰에서도 의도한
//    "모달 하단 고정"이 깨진다. 컴파일 에러·린트 경고 없이 silent failure.
@if (viewType() === "modal" && canEdit()) {
  <sd-dock class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">
    <!-- 확인/취소/삭제/복구 버튼 ... -->
  </sd-dock>
}

// ✅ [position]="'bottom'"을 명시하여 <sd-dock-container> 하단에 고정
@if (viewType() === "modal" && canEdit()) {
  <sd-dock
    [position]="'bottom'"
    class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest"
  >
    <!-- 확인/취소/삭제/복구 버튼 ... -->
  </sd-dock>
}
```

**근거**: `SdDock.position`의 기본값이 `"top"`이다(`packages/angular/src/layout/dock/sd-dock.ts:97`). 하단 액션 바 용도로 `<sd-dock>`을 도입할 때 `[position]`을 생략하면 `<sd-dock-container>`가 상단부터 dock을 쌓기 때문에 topbar 영역 뒤에 깔리고, topbar가 없는 modal 뷰에서도 "모달 하단 고정"이 깨진다. 타입 시스템은 기본값으로 통과시키므로 컴파일러·린터가 경고하지 않는다.
