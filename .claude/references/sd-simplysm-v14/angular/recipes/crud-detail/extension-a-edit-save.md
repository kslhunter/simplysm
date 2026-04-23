← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 A: 편집/저장

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음)

최소 뼈대의 읽기 전용 필드를 **편집 가능**으로 바꾸고, topbar에 "저장" 버튼(또는 Ctrl+S)을 추가하여 **일괄 저장**을 도입한다. `obj.clone(this.data())` snapshot + `obj.equal(data, _dataSnapshot)` 기반 변경 감지를 부착하고, 라우트 이탈 시 미저장 변경사항을 확인하는 `setupCanDeactivate` 가드를 등록한다. 편집은 page/modal/control 모든 뷰에서 동작하며, 뷰별 UI 배치는 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)에서 처리한다.

**이 확장이 도입하는 요소:**

- **imports:** `computed`, `viewChild`, `obj`, `setupCanDeactivate`, `mark`, `SdCommandDirective` outputs에 `sdSaveCommand` 추가, 아이콘 `tablerDeviceFloppy`
- **DI:** 없음 (최소 뼈대와 동일)
- **파생:** `canEdit = computed(() => perms().includes("edit"))` (뷰 분기 없음 — 편집은 3뷰 모두에서 가능, 뷰별 UI는 [확장 C](./extension-c-modal-view.md)/[확장 D](./extension-d-control-view.md)에서 분기)
- **상태:** `_dataSnapshot?: ICustomer` (직전 `_refresh()` 시점 data의 깊은 복제), `isNew = computed(() => data().id == null)` (신규 레코드 여부)
- **권한 키 확장:** `injectPermsSignal` 두 번째 인자 `["use"]` → `["use", "edit"]`
- **hostDirectives·host:** `outputs`에 `sdSaveCommand` 추가, `host`에 `(sdSaveCommand)="onSaveButtonClick()"` 추가
- **viewChild:** `formCtrl = viewChild<SdForm>("formCtrl")` (Ctrl+S 경로 통합용)
- **메서드:** `onSaveButtonClick`, `onSubmit`, `_checkIgnoreChanges`
- **for Template:** `protected readonly mark = mark;` (템플릿 `(valueChange)="mark(data)"` 호출용)
- **생성자:** 기존 초기 effect 뒤에 `setupCanDeactivate(() => this._checkIgnoreChanges())`
- **템플릿:** topbar에 "저장" 버튼 추가(`@if (canEdit())`), `<sd-form>` → `<sd-form #formCtrl (formSubmit)="onSubmit()">` 교체, 필드 `[readonly]="true"` → `[disabled]="!canEdit()"` 전환, 모든 입력 필드에 `(valueChange)="mark(data)"` 추가
- **_refresh 변경:** 말미에 `this._dataSnapshot = data.id == null ? undefined : obj.clone(this.data());` 추가

> 상세: [`<sd-form> #formCtrl / requestSubmit()`](../../ui-form/sd-form.md) · [`setupCanDeactivate`](../../utils/setup-functions.md#setupcandeactivate)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 최소 뼈대 위에 번호 순서대로 삽입·교체할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 교체 — @angular/core에 {computed, viewChild} 추가, @simplysm/core-common에 {obj} 추가,
//    @simplysm/angular에 {setupCanDeactivate, mark} 추가, 아이콘에 tablerDeviceFloppy 추가.
import { tablerAlertTriangle, tablerDeviceFloppy } from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked,
  viewChild, ViewEncapsulation,
} from "@angular/core";
import { type DateTime, obj } from "@simplysm/core-common";
import {
  FormatPipe, injectPermsSignal, injectViewTitleSignal, mark,
  SdBusyContainer, SdButton, SdCommandDirective,
  SdForm, SdTextfield, SdToastProvider, SdTopbar, SdTopbarContainer,
  setupCanDeactivate,
} from "@simplysm/angular";

// 2) @Component — hostDirectives에 sdSaveCommand 추가, host에 (sdSaveCommand) 바인딩 추가.
@Component({
  // ...selector/changeDetection/encapsulation/standalone/imports 동일
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdSaveCommand"] },
  ],
  host: {
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  // template: 아래 6)에서 상세
})

// 3) 권한 키 확장 — ["use"] → ["use", "edit"]
perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);

// 4) 파생·상태·viewChild 추가
protected readonly canEdit = computed(() => this.perms().includes("edit"));
protected readonly isNew = computed(() => this.data().id == null);
private _dataSnapshot?: ICustomer;

protected readonly formCtrl = viewChild<SdForm>("formCtrl");

// 5) 생성자에 setupCanDeactivate 추가 (기존 초기 effect 뒤)
constructor() {
  // 기존 초기 effect 동일...
  setupCanDeactivate(() => this._checkIgnoreChanges());
}

// 6) template — topbar에 "저장" 버튼 추가, <sd-form>을 <sd-form #formCtrl (formSubmit)>로 교체,
//    필드 [readonly]="true" → [disabled]="!canEdit()"로 전환, 입력 필드에 (valueChange)="mark(data)" 추가.
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
                          (valueChange)="mark(data)"
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>전화번호</th>
                      <td>
                        <sd-textfield
                          [type]="'text'" [disabled]="!canEdit()"
                          [(value)]="data().phone"
                          (valueChange)="mark(data)"
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

  // 신규는 변경 체크 없이 저장. 기존 항목이면 snapshot 대비 변경 여부를 판정.
  if (!this.isNew() && this._dataSnapshot != null && obj.equal(this.data(), this._dataSnapshot)) {
    this._sdToast.info("변경사항이 없습니다.");
    return;
  }

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 앱별 ORM upsert — 예:
    //   await this._appOrm.connectAsync(async (db) => {
    //     await db.customer()
    //       .where((c) => [expr.eq(c.id, this.data().id)])
    //       .upsert(() => ({ name: this.data().name, phone: this.data().phone }));
    //   });
    // 검증 실패 시 throw 하면 sdToast.try가 포착하여 에러 토스트를 표시한다 (이후 흐름은 생략).

    this._sdToast.success("저장되었습니다.");
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

private _checkIgnoreChanges(): boolean {
  return (
    this._dataSnapshot == null ||
    obj.equal(this.data(), this._dataSnapshot) ||
    confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?")
  );
}

// 8) _refresh 변경 — 말미에 snapshot 갱신
}

// 9) _refresh 말미에 snapshot 갱신
private async _refresh(): Promise<void> {
  // ... (최소 뼈대 동일 조회 로직)

  this.data.set(data);
  // 신규(id == null)면 snapshot을 비워 변경 체크를 항상 통과시키고 저장을 허용한다.
  this._dataSnapshot = data.id == null ? undefined : obj.clone(this.data());
}

// 10) 아이콘 + mark 템플릿 참조 추가
protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
protected readonly mark = mark;
```

**포인트:**

- **`obj.equal`은 deep equal**(`packages/core-common/src/utils/obj.ts:172`)이므로 `data().field = "x"` 같은 field mutation도 snapshot 대비 **저장 판정에 자동 반영**된다. 입력 필드의 `(valueChange)="mark(data)"`는 OnPush 재렌더링·연계 computed 갱신을 위한 **통지** 용도이며, 값 비교(저장 감지)와는 별개다.
- **snapshot은 반드시 `obj.clone`으로 깊은 복제한다.** `this._dataSnapshot = this.data()` 같은 얕은 참조 대입은 `data().field = "x"` mutation을 snapshot까지 오염시켜 변경 감지가 실패한다. `_refresh()` 말미에서 `obj.clone`(`packages/core-common/src/utils/obj.ts:19`)으로 저장해야 비교가 정확히 동작한다.
- **`isNew = computed(() => data().id == null)`은 PK 형태에 주의한다.** 클라이언트 UUID 선할당·자연키·복합키처럼 신규 상태에서도 `id`가 존재하는 스키마에서는 이 판정이 깨진다. 해당 스키마는 `isNew`를 `signal<boolean>(false)`로 유지하고 `_refresh()` 내부에서 명시 세팅하며, snapshot 분기도 `this.isNew() ? undefined : obj.clone(this.data())`로 치환한다.
- **Ctrl+S 경로 통일:** `hostDirectives` → `(sdSaveCommand)="onSaveButtonClick()"` → `formCtrl()?.requestSubmit()` → `<sd-form (formSubmit)="onSubmit()">`. 버튼 클릭과 단축키가 완전히 동일한 경로로 수렴한다.
- **`setupCanDeactivate(() => this._checkIgnoreChanges())`** — 라우트 이탈 시 snapshot 대비 변경이 있으면 `confirm`으로 사용자 확인을 요청한다. [확장 C](./extension-c-modal-view.md)(modal 뷰)에서는 조건에 `viewType() === "modal" ||`를 추가하여 modal에서는 항상 이탈을 허용한다.
- **`_checkIgnoreChanges`는 `_dataSnapshot == null`을 true로 취급** — 신규(snapshot 없음)이거나 아직 로드 전이면 이탈을 즉시 허용한다. snapshot이 있어도 `obj.equal`로 값이 동일하면 허용.

> 공통 규칙(`mark` 오용 전반, `setupCanDeactivate` 호출 위치, `_sdSharedData.wait()` 조건, 시트 셀 `[inset]`/`[size]`, soft-delete 선택 기준)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다.
