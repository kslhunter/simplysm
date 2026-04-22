← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 A: 편집/저장

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음)

최소 뼈대(§3)의 읽기 전용 필드를 **편집 가능**으로 바꾸고, topbar에 "저장" 버튼(또는 Ctrl+S)을 추가하여 **일괄 저장**한다. `obj.clone(data)` snapshot + `obj.equal(data, _snapshot)` 기반 변경 감지를 도입하고, 라우트 이탈 시 미저장 변경사항을 확인하는 `setupCanDeactivate` 가드를 부착한다. 편집은 page/modal/control 모든 뷰에서 가능하며, 뷰별 UI 배치는 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)에서 처리한다.

**이 확장이 도입하는 요소:**

- **imports:** `computed`, `viewChild`, `obj`, `setupCanDeactivate`, `SdCommandDirective` outputs에 `sdSaveCommand` 추가, `tablerDeviceFloppy`
- **DI:** 없음 (최소 뼈대와 동일)
- **파생:** `canEdit = computed(() => perms().includes("edit"))` (viewType 제약 없음 — 편집은 page/modal/control 모든 뷰에서 가능. 뷰별 UI는 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)의 `@if (viewType() === "...")` 분기로 처리)
- **상태:** `_snapshot?: ICustomer` (직전 `_refresh()` 시점의 data 깊은 복제), `isNew = computed(() => data().id == null)` (신규 레코드 여부)
- **권한 키 확장:** `injectPermsSignal` 두 번째 인자 `["use"]` → `["use", "edit"]`
- **hostDirectives·host:** `outputs`에 `sdSaveCommand` 추가, `host`에 `(sdSaveCommand)="onSaveButtonClick()"` 추가
- **viewChild:** `formCtrl = viewChild<SdForm>("formCtrl")` (Ctrl+S 경로 공유)
- **메서드:** `onSaveButtonClick`, `onSubmit`, `_checkIgnoreChanges`, `onRefreshButtonClick`에 변경사항 체크 추가
- **생성자:** `setupCanDeactivate(() => this._checkIgnoreChanges())`
- **템플릿:** topbar에 "저장" 버튼 추가(`@if (canEdit())`), `<sd-form>`을 `<sd-form #formCtrl (formSubmit)="onSubmit()">`로 교체, 필드 `[readonly]="true"` → `[disabled]="!canEdit()"`로 전환
- **_refresh 변경:** 말미에 `this._snapshot = data.id == null ? undefined : obj.clone(data);` 추가

> 상세: [`<sd-form> #formCtrl / requestSubmit()`](../../ui-form/sd-form.md) · [`setupCanDeactivate`](../../utils/setup-functions.md#setupcandeactivate)

```typescript
// 1) imports 교체 — @angular/core에 {computed, viewChild} 추가, @simplysm/core-common에 {obj} 추가,
//    @simplysm/angular에 {setupCanDeactivate} 추가, 아이콘에 tablerDeviceFloppy 추가.
import { tablerAlertTriangle, tablerDeviceFloppy, tablerRefresh } from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked,
  viewChild, ViewEncapsulation,
} from "@angular/core";
import { type DateTime, obj } from "@simplysm/core-common";
import {
  FormatPipe, injectPermsSignal, injectViewTitleSignal,
  SdBusyContainer, SdButton, SdCommandDirective,
  SdForm, SdTextfield, SdToastProvider, SdTopbar, SdTopbarContainer,
  setupCanDeactivate,
} from "@simplysm/angular";

// 2) @Component — hostDirectives outputs에 "sdSaveCommand" 추가, host에 (sdSaveCommand) 바인딩 추가.
@Component({
  // ...selector/cd/encapsulation/standalone/imports 동일
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  // template: 아래 6)에서 상세
})

// 3) 권한 키 확장 — ["use"] → ["use", "edit"]
protected readonly perms = injectPermsSignal(
  () => ["sales.customer"],
  () => ["use", "edit"],
);

// 4) 파생·상태·viewChild 추가
protected readonly canEdit = computed(() => this.perms().includes("edit"));
protected readonly isNew = computed(() => this.data().id == null);
private _snapshot?: ICustomer;

protected readonly formCtrl = viewChild<SdForm>("formCtrl");

// 5) 생성자에 setupCanDeactivate 추가
constructor() {
  // 기존 초기 effect 동일...
  setupCanDeactivate(() => this._checkIgnoreChanges());
}

// 6) template — topbar에 "저장" 버튼 추가, <sd-form>을 <sd-form #formCtrl (formSubmit)>로 교체,
//    필드 [readonly]="true" → [disabled]="!canEdit()"로 전환.
template: `
  <sd-busy-container [busy]="busyCount() > 0">
    @if (initialized()) {
      @if (!perms().includes("use")) { <!-- 경고 동일 --> }
      @else {
        <sd-topbar-container>
          <sd-topbar>
            <h4>{{ viewTitle() }}</h4>
            @if (canEdit()) {
              <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">
                <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
              </sd-button>
            }
            <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
              <ng-icon [svg]="tablerRefresh" /> 새로고침 <small>(CTRL+ALT+L)</small>
            </sd-button>
          </sd-topbar>

          <div class="flex-column fill">
            <sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-fill">
              <div class="p-default">
                <table class="form-table">
                  <tbody>
                    <tr>
                      <th>명칭</th>
                      <td>
                        <sd-textfield
                          [type]="'text'" [required]="true"
                          [disabled]="!canEdit()" [(value)]="data().name"
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>전화번호</th>
                      <td>
                        <sd-textfield
                          [type]="'text'" [disabled]="!canEdit()"
                          [(value)]="data().phone"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </sd-form>
            <!-- lastModified 블록 동일 (최소 뼈대 §3) -->
          </div>
        </sd-topbar-container>
      }
    }
  </sd-busy-container>
`

// 7) 메서드 추가 — onSaveButtonClick / onSubmit / _checkIgnoreChanges
protected onSaveButtonClick(): void {
  this.formCtrl()?.requestSubmit();
}

protected async onSubmit(): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("edit")) return;

  // 신규면 변경사항 체크 없이 저장. 기존 항목이면 snapshot 대비 변경사항 여부 판정.
  if (!this.isNew() && this._snapshot != null && obj.equal(this.data(), this._snapshot)) {
    this._sdToast.info("변경사항이 없습니다.");
    return;
  }

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 앱별 ORM upsert — 예:
    //   await this._appOrm.connectAsync(async (db) => {
    //     await db.customer.upsertAsync(this.data());
    //   });
    // 검증 실패 시 throw 하면 sdToast.try가 포착하여 에러 토스트 표시 (이후 흐름 생략).

    this._sdToast.success("저장되었습니다.");
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

private _checkIgnoreChanges(): boolean {
  return (
    this._snapshot == null ||
    obj.equal(this.data(), this._snapshot) ||
    confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?")
  );
}

// 8) onRefreshButtonClick에 변경사항 체크 추가
protected async onRefreshButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("use")) return;
  if (!this._checkIgnoreChanges()) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

// 9) _refresh 말미에 snapshot 갱신 추가
private async _refresh(): Promise<void> {
  // ... (최소 뼈대 동일 조회 로직)

  this.data.set(data);
  // 신규(id == null)면 스냅샷 저장 생략 — 변경사항 체크를 항상 통과시켜 저장 허용
  this._snapshot = data.id == null ? undefined : obj.clone(data);
}

// 10) 아이콘 추가
protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
```

**포인트:**

- **`obj.equal`은 deep equal**(`packages/core-common/src/utils/obj.ts:172`)이므로 `data().field = "x"` 같은 mutation도 snapshot 대비 변경 감지에 자동 반영된다. 별도 `mark(data)` 호출은 불필요.
- **snapshot은 반드시 `obj.clone`로 깊은 복제한다.** `this._snapshot = this.data()` 같은 얕은 참조 대입은 `data().field = "x"` mutation을 snapshot까지 오염시켜 변경 감지가 실패한다. `_refresh()` 말미에서 `obj.clone(data)`로 깊은 복제하여 저장해야 `obj.equal` 비교가 정확히 동작한다.
- **`isNew = computed(() => data().id == null)`은 PK 형태에 주의한다.** 자동증가 숫자 PK가 아닌 경우(클라이언트 UUID 선할당 / 자연키 / 복합키) 신규 상태에도 `id`가 존재하여 이 판정이 깨진다. 이런 스키마에서는 `isNew`를 `signal<boolean>(false)`로 유지하고 `_refresh()` 내부에서 별도 세팅하며, snapshot 분기(`data.id == null ? undefined : obj.clone(data)`)도 `this.isNew() ? undefined : obj.clone(data)`로 바꾼다.
- **Ctrl+S 경로 통일:** `hostDirectives` → `(sdSaveCommand)="onSaveButtonClick()"` → `formCtrl()?.requestSubmit()` → `<sd-form (formSubmit)="onSubmit()">`. 상단 "저장" 버튼 클릭과 완전히 동일한 경로로 통합.
- **`setupCanDeactivate(() => this._checkIgnoreChanges())`**: 라우트 이탈 시 snapshot 대비 변경사항이 있으면 `confirm`으로 사용자 확인. [확장 C](./extension-c-modal-view.md)(modal 뷰)에서는 조건에 `viewType() === "modal" ||`를 추가하여 modal에서는 항상 이탈 허용한다.
- **조용한 저장 (`hideNoChangeMessage` 대응):** 프로그래밍 저장(예: `onPrintButtonClick` 내부에서 먼저 저장)에서 "변경사항이 없습니다" info 토스트를 억제하려면 `onSubmit(silent: boolean)` 시그니처를 도입하여 `if (!silent) this._sdToast.info("변경사항이 없습니다.");`로 감싼다.
- **`_checkIgnoreChanges`는 `_snapshot == null`을 true로 취급** — 신규(snapshot 없음)이거나 아직 로드 전이면 이탈/새로고침을 즉시 허용. snapshot이 있어도 `obj.equal`로 값이 동일하면 허용.
