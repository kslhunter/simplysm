# Recipe: CRUD 상세폼 화면 직접 조립

> **CRITICAL: 뷰 범위 확인 선행**
> 이 레시피로 실제 화면을 생성하기 전, 지원할 뷰(page / modal / control)를 **반드시 사용자에게 질문**한다. 본 레시피는 **최소 뼈대(§3. 읽기 전용 상세 폼, page 뷰 전용) → 확장 A~F 누적** 구조로 구성된다. 필요한 확장만 선택적으로 얹고, 당장 쓰지 않는 뷰/확장의 분기·계약·`<ng-template #modalActionTpl>` 등은 **죽은 코드가 되므로 생성에서 제외**한다. modal 뷰는 [확장 C](#7-확장-c-modal-뷰)에서, control 뷰(마스터-디테일의 디테일 영역)는 [확장 D](#8-확장-d-control-뷰)에서 각각 다룬다. 추측으로 3뷰를 모두 박지 않는다.

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` 표준 컴포넌트를 **직접 조립**하여 단일 레코드 CRUD 상세폼을 구성한다. 과거 `SdDataDetail` / `SdDataDetailBase`가 감추고 있던 load·save·delete 라이프사이클, `obj.equal` snapshot 기반 변경 감지, `setupCanDeactivate` 이탈 방지, busy 카운트, `SdToastProvider.try` 에러 래핑, Ctrl+S/Ctrl+Alt+L 단축키를 화면 내부에 인라인으로 풀어쓴다. **최소 시작점(§3. 읽기 전용 상세 폼)에서 출발해 필요한 확장만 얹는다** — A. 편집/저장 / B. 삭제/복구 토글 / C. modal 뷰 / D. control 뷰 / E. 보조 기능 영역 / F. 복합 상세(내부 `<sd-sheet>`).

## 1. Overview

- **구성 원칙:** 최소 뼈대([§3](#3-최소-뼈대-읽기-전용-상세-폼)) → [확장 A~F](#5-확장-a-편집저장) 누적. 최소 뼈대는 "읽기 전용 상세 폼(page 뷰 전용)"이며, 편집·삭제·modal·control·보조·복합은 각각 별도 확장 섹션에서 얹는다.
- **최소 뼈대(§3) 조립 요소:**
  - `<sd-busy-container [busy]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 공통 컨테이너, 최소 뼈대는 page 뷰 전용이므로 `<sd-topbar>`를 **조건 없이** 렌더
  - `<sd-form>` — 읽기 전용 필드 배치 컨테이너 (최소 뼈대에서는 `(formSubmit)` 미사용 — 편집은 확장 A)
  - `<sd-textfield [readonly]="true">` — 읽기 전용 필드
  - `<sd-button>` — 새로고침 버튼 (Ctrl+Alt+L)
  - `injectViewTitleSignal()` — 라우트 기반 현재 페이지 타이틀
  - `injectPermsSignal()` — 권한 signal
  - `SdToastProvider.try(fn)` — 에러 래퍼 (busy 카운트는 호출부에서 `busyCount.update`로 직접 제어)
  - `SdCommandDirective`(`sdRefreshCommand`) — Ctrl+Alt+L 단축키
- **확장이 도입하는 요소**는 각 확장 섹션(A~F) 서두에서 명시한다. A+B+C+D 누적된 전체 조립 결과는 [부록 A. 풀 스택 합본 완성본](#부록-a-풀-스택-합본-완성본)에서 한눈에 확인할 수 있다.
- **제거된 추상화:** `SdDataDetail`(컴포넌트) / `SdDataDetailBase<T, R>`(추상 클래스) / `SdDataDetailDataInfo`(타입) / `#toolTpl`·`#prevTpl`·`#contentTpl`·`#nextTpl`·`#modalActionTpl` 슬롯 5종. 대체: 소비 컴포넌트가 표준 조각을 직접 조립.
- **데이터 비교:** `obj.clone(data)` snapshot 복제 + `obj.equal(a, b)` deep equal (`@simplysm/core-common`). 확장 A에서 도입.

## 2. 언제 사용하는가

| 상황 | 시작 지점 + 필요한 확장 |
|---|---|
| 단일 레코드 **읽기 전용 상세 폼** (page 뷰, 감사 필드 표시) | §3 최소 뼈대만 |
| 편집/저장 가능한 단일 레코드 상세 폼 | §3 + [확장 A](#5-확장-a-편집저장) |
| 삭제/복구 토글 포함 | §3 + 확장 A + [확장 B](#6-확장-b-삭제복구-토글) |
| 페이지 뷰와 **modal 뷰**(확인·취소·삭제·복구 하단 바) 모두에서 재사용 | §3 + 확장 A + 확장 B + [확장 C](#7-확장-c-modal-뷰) |
| 마스터-디테일의 "디테일" 영역 (**control 뷰**) | §3 + 확장 A + 확장 B + [확장 D](#8-확장-d-control-뷰) |
| page + modal + control **3뷰** 모두 지원 | §3 + 확장 A + 확장 B + 확장 C + 확장 D |
| 메인 폼과 별개의 "가져오기/출력" **보조 기능** 필요 | §3 + 확장 A + [확장 E](#9-확장-e-보조-기능-영역) |
| 상세 폼 내부에 **하위 컬렉션** 편집 (박스 목록 등) | §3 + 확장 A + [확장 F](#10-확장-f-복합-상세-내부-sd-sheet) |
| CRUD 리스트(시트) 화면 | 본 레시피 대신 [`crud-list.md`](./crud-list.md) 사용 |
| 페이지/모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 최소 뼈대: 읽기 전용 상세 폼

아래는 **읽기 전용 상세 폼(page 뷰)** 기준의 최소 뼈대 완성 컴포넌트다. 라우트로 진입하면 `itemId`를 받아 단일 레코드를 로드하고 읽기 전용 필드로 표시한다. 편집·삭제·modal·control·보조·복합이 필요하면 [§5 확장 A ~ §10 확장 F](#5-확장-a-편집저장)를 선택적으로 얹는다.

본 섹션에 등장하는 개별 API의 단독 사용법:

- [`<sd-busy-container>`](../ui-overlay.md#sdbusycontainer) — busy 오버레이 + [busyCount 패턴](../ui-overlay.md#busycount-카운트-패턴)
- [`<sd-topbar-container>` · `<sd-topbar>`](../ui-navigation.md#기본-사용-예제) — 탑바 + [슬롯 활용](../ui-navigation.md#topbar-내부-슬롯-활용)
- [`<sd-form>`](../ui-form.md#sdform) — 폼 래퍼 (읽기 전용 필드 배치)
- [`<sd-textfield>`](../ui-form.md#sdtextfield) · [`<sd-button>`](../ui-form.md#sdbutton) — 텍스트 입력 · 버튼
- [`injectViewTitleSignal`](../utils.md#injectviewtitlesignal) · [`injectPermsSignal`](../utils.md#injectpermssignal) · [`SdToastProvider.try`](../providers.md#try-사용-패턴)

```typescript
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle, tablerRefresh } from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import type { DateTime } from "@simplysm/core-common";
import {
  FormatPipe,
  injectPermsSignal,
  injectViewTitleSignal,
  SdBusyContainer,
  SdButton,
  SdCommandDirective,
  SdForm,
  SdTextfield,
  SdToastProvider,
  SdTopbar,
  SdTopbarContainer,
} from "@simplysm/angular";
// 앱별 대체: ORM provider + DbContext. simplysm 패키지가 아니라 각 앱이 소유한다.
import { AppOrmProvider } from "@adtek/client-common";

interface ICustomer {
  id: number | undefined;           // undefined면 신규 — 확장 A 편집/저장 시 활용
  name: string;
  phone: string;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}

@Component({
  selector: "app-customer-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdForm, SdButton, SdTextfield,
    FormatPipe, NgIcon,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (initialized()) {
        @if (!perms().includes("use")) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br />
            <br />
            '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ viewTitle() }}</h4>

              <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                <ng-icon [svg]="tablerRefresh" />
                새로고침
                <small>(CTRL+ALT+L)</small>
              </sd-button>
            </sd-topbar>

            <div class="flex-column fill">
              <sd-form class="flex-fill">
                <div class="p-default">
                  <table class="form-table">
                    <tbody>
                      <tr>
                        <th>명칭</th>
                        <td>
                          <sd-textfield
                            [type]="'text'"
                            [readonly]="true"
                            [(value)]="data().name"
                          />
                        </td>
                      </tr>
                      <tr>
                        <th>전화번호</th>
                        <td>
                          <sd-textfield
                            [type]="'text'"
                            [readonly]="true"
                            [(value)]="data().phone"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </sd-form>

              @if (data().lastModifiedAt || data().lastModifiedBy) {
                <div class="p-sm-default">
                  최종수정:
                  @if (data().lastModifiedAt) {
                    {{ data().lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
                  }
                  @if (data().lastModifiedBy) {
                    ({{ data().lastModifiedBy }})
                  }
                </div>
              }
            </div>
          </sd-topbar-container>
        }
      }
    </sd-busy-container>
  `,
})
export class CustomerDetail {
  //== DI ==
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _sdToast = inject(SdToastProvider);

  //== input ==
  itemId = input<number>();

  //== 타이틀 / 권한 ==
  protected readonly viewTitle = injectViewTitleSignal();
  protected readonly perms = injectPermsSignal(
    () => ["sales.customer"],
    () => ["use"],
  );

  //== 상태 ==
  protected readonly busyCount = signal(0);
  protected readonly initialized = signal(false);
  protected readonly data = signal<ICustomer>({
    id: undefined,
    name: "",
    phone: "",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  });

  //== 라이프사이클 ==
  constructor() {
    // 최초 진입 + itemId 변경 시 재조회.
    effect(() => {
      this.itemId(); // 의존성 등록
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });
  }

  //== 이벤트 핸들러 ==
  protected async onRefreshButtonClick(): Promise<void> {
    if (this.busyCount() > 0) return;
    if (!this.perms().includes("use")) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  //== 내부 메서드 ==
  private async _refresh(): Promise<void> {
    let data: ICustomer;
    if (this.itemId() == null) {
      data = {
        id: undefined, name: "", phone: "",
        lastModifiedAt: undefined, lastModifiedBy: undefined,
      };
    } else {
      // 앱별 ORM 조회 — 예:
      //   data = await this._appOrm.connectAsync(async (db) =>
      //     (await db.customer.where((it) => [expr.eq(it.id, this.itemId())]).single())!
      //   );
      throw new Error("구현 필요");
    }

    this.data.set(data);
  }

  //== 아이콘 ==
  protected readonly tablerAlertTriangle = tablerAlertTriangle;
  protected readonly tablerRefresh = tablerRefresh;
}
```

## 4. 최소 뼈대 분해 설명

### 블록 역할

| 블록 | 역할 |
|---|---|
| `<sd-busy-container [busy]>` | 전체 busy 오버레이 (`busyCount() > 0`일 때 표시) |
| `@if (initialized())` | 최초 조회 완료 전 본문 숨김 (깜박임 방지) |
| `@if (!perms().includes("use"))` | 권한 없음 메시지 |
| `<sd-topbar-container>` + `<sd-topbar>` (조건 없이) | page 뷰 전용 공통 컨테이너 + topbar (새로고침 버튼). 최소 뼈대는 `injectViewTypeSignal()` 분기를 쓰지 않으므로 `<sd-topbar>`를 조건 없이 렌더 |
| `<div class="flex-column fill">` + `<sd-form class="flex-fill">` | form 본문 + lastModified 블록을 세로로 배치하는 래퍼. form이 읽기 전용이므로 `(formSubmit)`·`#formCtrl` 미사용 |
| `<sd-textfield [readonly]="true">` | 읽기 전용 필드. 양방향 `[(value)]`는 유지하되 `readonly`로 편집을 막는다 |
| `@if (data().lastModifiedAt \|\| data().lastModifiedBy)` | 감사 필드 조건부 렌더. 도메인에 해당 필드가 없어도 자동 숨김 |
| `hostDirectives`: `SdCommandDirective` + `(sdRefreshCommand)` | Ctrl+Alt+L 단축키 → `onRefreshButtonClick()` |
| 초기 effect (`itemId()` 의존성 + `untracked(async)`) | 최초 + `itemId` 변경 시 재조회 + `initialized.set(true)` |

### 상태 분해

| signal / 필드 | 역할 |
|---|---|
| `itemId` | 부모로부터 주입받는 레코드 식별자 (`input<number>()`). `undefined`면 신규(확장 A에서 활용) |
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `data` | 현재 로드된 데이터 (`lastModifiedAt`·`lastModifiedBy` 포함) |
| `perms` | 권한 signal. `use`는 `perms().includes("use")`로 호출처에서 직접 검사 |
| `viewTitle` | 라우트 기반 현재 페이지 타이틀 |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onRefreshButtonClick()` | busy/권한 가드 → `busyCount` 증가 → `_sdToast.try(_refresh)` → `busyCount` 감소 |
| `_refresh()` | `itemId() == null`이면 빈 객체로 초기화, 아니면 앱별 ORM 조회 → `data.set`. busy/try는 호출부 책임. 조회 로직은 호출처가 한 곳뿐이므로 `_refresh` 내부에 인라인 |

> **확장이 도입하는 블록·상태·메서드** (예: `canEdit` / `_snapshot` / `isNew` / `onSubmit` / `_toggleDelete` / `close` output / modal 하단 바 / control 상단 바 / 보조 form / 내부 `<sd-sheet>` 등)는 [§5 확장 A ~ §10 확장 F](#5-확장-a-편집저장) 각 확장 섹션의 "이 확장이 도입하는 요소" bullet + "포인트" bullet에서 다룬다. A+B+C+D 누적된 완성본은 [부록 A. 풀 스택 합본 완성본](#부록-a-풀-스택-합본-완성본)에서 한눈에 확인 가능.

## 5. 확장 A: 편집/저장

최소 뼈대(§3)의 읽기 전용 필드를 **편집 가능**으로 바꾸고, topbar에 "저장" 버튼(또는 Ctrl+S)을 추가하여 **일괄 저장**한다. `obj.clone(data)` snapshot + `obj.equal(data, _snapshot)` 기반 변경 감지를 도입하고, 라우트 이탈 시 미저장 변경사항을 확인하는 `setupCanDeactivate` 가드를 부착한다. 편집은 page/modal/control 모든 뷰에서 가능하며, 뷰별 UI 배치는 확장 C/D에서 처리한다.

**이 확장이 도입하는 요소:**

- **imports:** `computed`, `viewChild`, `obj`, `setupCanDeactivate`, `SdCommandDirective` outputs에 `sdSaveCommand` 추가, `tablerDeviceFloppy`
- **DI:** 없음 (최소 뼈대와 동일)
- **파생:** `canEdit = computed(() => perms().includes("edit"))` (viewType 제약 없음 — 편집은 page/modal/control 모든 뷰에서 가능. 뷰별 UI는 확장 C/D의 `@if (viewType() === "...")` 분기로 처리)
- **상태:** `_snapshot?: ICustomer` (직전 `_refresh()` 시점의 data 깊은 복제), `isNew = computed(() => data().id == null)` (신규 레코드 여부)
- **권한 키 확장:** `injectPermsSignal` 두 번째 인자 `["use"]` → `["use", "edit"]`
- **hostDirectives·host:** `outputs`에 `sdSaveCommand` 추가, `host`에 `(sdSaveCommand)="onSaveButtonClick()"` 추가
- **viewChild:** `formCtrl = viewChild<SdForm>("formCtrl")` (Ctrl+S 경로 공유)
- **메서드:** `onSaveButtonClick`, `onSubmit`, `_checkIgnoreChanges`, `onRefreshButtonClick`에 변경사항 체크 추가
- **생성자:** `setupCanDeactivate(() => this._checkIgnoreChanges())`
- **템플릿:** topbar에 "저장" 버튼 추가(`@if (canEdit())`), `<sd-form>`을 `<sd-form #formCtrl (formSubmit)="onSubmit()">`로 교체, 필드 `[readonly]="true"` → `[disabled]="!canEdit()"`로 전환
- **_refresh 변경:** 말미에 `this._snapshot = data.id == null ? undefined : obj.clone(data);` 추가

> 상세: [`<sd-form> #formCtrl / requestSubmit()`](../ui-form.md#sdform) · [`setupCanDeactivate`](../utils.md#setupcandeactivate)

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
- **`setupCanDeactivate(() => this._checkIgnoreChanges())`**: 라우트 이탈 시 snapshot 대비 변경사항이 있으면 `confirm`으로 사용자 확인. 확장 C(modal 뷰)에서는 조건에 `viewType() === "modal" ||`를 추가하여 modal에서는 항상 이탈 허용한다.
- **조용한 저장 (`hideNoChangeMessage` 대응):** 프로그래밍 저장(예: `onPrintButtonClick` 내부에서 먼저 저장)에서 "변경사항이 없습니다" info 토스트를 억제하려면 `onSubmit(silent: boolean)` 시그니처를 도입하여 `if (!silent) this._sdToast.info("변경사항이 없습니다.");`로 감싼다.
- **`_checkIgnoreChanges`는 `_snapshot == null`을 true로 취급** — 신규(snapshot 없음)이거나 아직 로드 전이면 이탈/새로고침을 즉시 허용. snapshot이 있어도 `obj.equal`로 값이 동일하면 허용.

## 6. 확장 B: 삭제/복구 토글

확장 A(편집/저장)를 전제로, 기존 레코드에 대한 **soft-delete 토글**(삭제/복구 버튼)을 추가한다. 도메인 타입에 `isDeleted: boolean` 필드를 추가하고, 삭제·복구 버튼은 최소 뼈대의 topbar에 `@if (!isNew() && canEdit())` 조건으로 배치한다. 뷰별 UI(modal 하단 바 / control 상단 바의 삭제 버튼)는 확장 C/D에서 추가로 처리한다.

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
- **모달/컨트롤 뷰의 삭제 버튼은 확장 C/D에서 별도 배치** — topbar가 없는 뷰에서는 이 확장만으로는 삭제 UI가 보이지 않는다. 확장 C(modal 하단 바) / 확장 D(control 상단 바)에서 동일 `_toggleDelete` 메서드를 재사용하여 배치한다.

## 7. 확장 C: modal 뷰

확장 A(편집/저장) + 확장 B(삭제/복구)를 전제로, 동일 컴포넌트를 **modal 뷰**로도 재사용한다. `SdModalProvider.showAsync`로 띄우면 `viewType() === "modal"`로 자동 판정되며, 기존 `<sd-topbar>`를 `@if (viewType() === "page") { ... }`로 래핑하여 page 뷰 전용으로 돌리고, 모달에는 하단 액션 바(확인·취소·삭제·복구)와 우측 상단 새로고침 아이콘을 추가한다. 모달은 `implements SdModalContentDef<boolean | undefined>`로 계약을 부착하여 호출 측이 저장/닫기 결과를 받을 수 있다.

**이 확장이 도입하는 요소:**

- **imports:** `output`, `TemplateRef`, `injectViewTypeSignal`, `type SdModalContentDef`, `SdActivatedModalProvider`, `SdAppStructureProvider`, `SdSystemLogProvider`, `SdAnchor`, `SdDockContainer`, `SdDock`, `injectCurrentPageCodeSignal`, `injectFullPageCodeSignal`
- **DI:** `_sdActivatedModal = inject(SdActivatedModalProvider, { optional: true })`, `_sdAppStructure = inject(SdAppStructureProvider)`, `_sdSystemLog = inject(SdSystemLogProvider)`, `_fullPageCode = injectFullPageCodeSignal()`, `_currPageCode = injectCurrentPageCodeSignal()`
- **계약:** `implements SdModalContentDef<boolean | undefined>`, `close = output<boolean | undefined>()`, `actionTplRef?: TemplateRef<any>` (필드 선언만 — `SdModal`이 setter 프록시로 감쌈)
- **viewChild:** `_modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef })`
- **파생:** `viewType = injectViewTypeSignal()`, `modalOrPageTitle = computed(...)` (modal이면 `_sdActivatedModal?.modalComponent()?.title()`, 아니면 라우트 기반 타이틀)
- **생성자 effect:** `effect(() => { this.actionTplRef = this._modalActionTpl(); })` (모달 헤더 우측 액션 슬롯 브릿지)
- **setupCanDeactivate 조건 변경:** `() => this.viewType() === "modal" || this._checkIgnoreChanges()` — modal에서는 항상 true(이탈 허용)
- **onSubmit / `_toggleDelete` 변경:** 성공 경로에 `this.close.emit(true)` 추가
- **템플릿 교체 1:** 기존 `<sd-topbar>...</sd-topbar>`를 `@if (viewType() === "page") { <sd-topbar>...</sd-topbar> }`로 **래핑** (page 뷰 전용으로 돌림)
- **템플릿 교체 2:** topbar 내부 `<h4>{{ viewTitle() }}</h4>` → `<h4>{{ modalOrPageTitle() }}</h4>`, 권한 경고의 viewTitle도 동일 교체
- **템플릿 추가:** `<sd-topbar-container>` 내부 main 래퍼(`<div class="flex-column fill">`)를 `<sd-dock-container>`로 감싸고, 그 내부에 `@if (viewType() === "modal" && canEdit())` 블록으로 `<sd-dock [position]="'bottom'">` 하단 액션 바(확인·취소·삭제·복구) 추가
- **템플릿 추가:** `<sd-busy-container>` 바깥에 `<ng-template #modalActionTpl>`로 모달 우측 상단 새로고침 아이콘 정의

<!-- MOVE: docs/provider-types.md#sdmodalcontentdef --> → [`SdModalContentDef` 구현 패턴](../provider-types.md#구현-패턴) 참조
<!-- MOVE: docs/providers.md#sdactivatedmodalprovider --> → [`SdActivatedModalProvider` 사용 패턴](../providers.md#모달-컨텍스트-사용-패턴) 참조
> 상세: [`injectViewTypeSignal`](../utils.md#injectviewtypesignal)

> 상세: [`<sd-dock> position="bottom"`](../ui-layout.md#sddock)

```typescript
// 1) imports 추가
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
  TemplateRef, untracked, viewChild, ViewEncapsulation,
} from "@angular/core";
import {
  FormatPipe, injectCurrentPageCodeSignal, injectFullPageCodeSignal, injectPermsSignal,
  injectViewTitleSignal, injectViewTypeSignal,
  SdActivatedModalProvider, SdAnchor, SdAppStructureProvider,
  SdBusyContainer, SdButton, SdCommandDirective,
  SdDock, SdDockContainer,
  SdForm, type SdModalContentDef,
  SdSystemLogProvider, SdTextfield, SdToastProvider,
  SdTopbar, SdTopbarContainer, setupCanDeactivate,
} from "@simplysm/angular";

// 2) @Component imports 배열에 SdAnchor / SdDockContainer / SdDock 추가

// 3) DI 추가
private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
private readonly _sdAppStructure = inject(SdAppStructureProvider);
private readonly _sdSystemLog = inject(SdSystemLogProvider);
private readonly _fullPageCode = injectFullPageCodeSignal();
private readonly _currPageCode = injectCurrentPageCodeSignal();

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
  protected readonly modalOrPageTitle = computed(() => {
    try {
      return (
        this._sdActivatedModal?.modalComponent()?.title() ??
        this._sdAppStructure.getTitleByFullCode(
          this._currPageCode?.() ?? this._fullPageCode(),
        )
      );
    } catch (err) {
      void this._sdSystemLog.writeAsync("warn", `title 계산 실패: ${String(err)}`);
      return "";
    }
  });

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
//    viewTitle → modalOrPageTitle 교체, main 래퍼를 <sd-dock-container>로 감싸고
//    modal 하단 바 + <ng-template #modalActionTpl> 추가
template: `
  <sd-busy-container [busy]="busyCount() > 0">
    @if (initialized()) {
      @if (!perms().includes("use")) {
        <!-- '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. -->
      } @else {
        <sd-topbar-container>
          @if (viewType() === "page") {
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>
              <!-- 저장/삭제/복구/새로고침 (확장 A/B 동일 — viewTitle을 modalOrPageTitle로 교체) -->
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
- **`modalOrPageTitle` 우선순위**: 모달 컴포넌트의 `title()` input이 세팅되어 있으면 그것을 우선, 없으면 라우트 기반 타이틀을 사용. `_sdSystemLog.writeAsync("warn", ...)`로 실패 시 로그 남김.
- **확장 D(control 뷰)와 병행 가능** — 두 분기 블록(`@if (viewType() === "modal")` / `@if (viewType() === "control")`)이 상호 배타이므로 같은 `<sd-dock-container>` 내부에 나란히 둘 수 있다.

## 8. 확장 D: control 뷰

확장 A(편집/저장) + 확장 B(삭제/복구)를 전제로, 동일 컴포넌트를 **control 뷰**(마스터-디테일의 디테일 영역)로도 재사용한다. 마스터 화면이 `<app-customer-detail [itemId]="selectedId()" class="flex-fill">`처럼 컴포넌트 selector를 직접 삽입하면 `viewType() === "control"`로 자동 판정되어, 상단 바에 저장·새로고침·삭제·복구 버튼이 가로로 배치된다. page 뷰의 topbar가 없고 modal 뷰의 하단 바가 없는 대신, main 영역 위에 `<sd-dock>` 상단 바가 놓인다.

**이 확장이 도입하는 요소:**

- **imports:** 확장 C에서 이미 도입된 `injectViewTypeSignal`, `SdDockContainer`, `SdDock`, `tablerDeviceFloppy`, `tablerRefresh`, `tablerEraser`, `tablerRestore`를 재사용. 확장 D를 확장 C 없이 단독 적용하는 경우 동일 imports를 신규 도입
- **파생:** `viewType = injectViewTypeSignal()` (확장 C 없이 단독 적용 시 신규 도입)
- **템플릿 추가:** 확장 C가 도입한 `<sd-dock-container>` 내부에 `@if (viewType() === "control" && canEdit())` 블록으로 `<sd-dock>` 상단 바(저장·새로고침·삭제·복구) 추가 — 확장 C의 modal 하단 바 블록과 나란히 배치

> 상세: [`injectViewTypeSignal`](../utils.md#injectviewtypesignal)

> 상세: [`<sd-dock> position 기본 "top"`](../ui-layout.md#sddock)

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
- **확장 C(modal 뷰)와 병행 가능** — 두 분기 블록(`@if (viewType() === "control")` / `@if (viewType() === "modal")`)이 상호 배타이므로 같은 `<sd-dock-container>` 내부에 나란히 둬도 안전하다. [부록 A 풀 스택 합본](#부록-a-풀-스택-합본-완성본)이 이 조합이다.
- **control 뷰에서는 `setupCanDeactivate`가 아무 동작 하지 않는다** — 라우트 guard도 모달 canDeactivateFn도 연결되지 않는다(`packages/angular/src/core/utils/setups/setupCanDeactivate.ts:5`). 마스터 화면이 이동할 때의 이탈 확인은 마스터 화면이 자체적으로 처리한다.

## 9. 확장 E: 보조 기능 영역

확장 A(편집/저장)를 전제로, 메인 폼의 submit과 **별개인 보조 기능**(예: 다른 사용자로부터 권한 복사, 출력 등)을 추가한다. 과거 `#toolTpl` 슬롯이 담당하던 역할을 소비 화면에 직접 인라인한다. 보조 영역은 control 뷰 상단 바 내부, modal 뷰 하단 바 옆, 또는 main 영역 내부에 별도의 `<sd-form>`으로 배치할 수 있다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSharedDataSelect` + 앱 공용 `useSharedSignal`(앱 공유 데이터 훅)
- **상태:** 예시 — `permCopySourceId = signal<number | undefined>(undefined)`, `sharedUsers = useSharedSignal("사용자")`
- **메서드:** 예시 — `onImportFormSubmit`
- **템플릿 추가:** control 뷰 `<sd-dock>` 내부 또는 main 영역에 보조 `<sd-form (formSubmit)>` 블록 (메인 `<sd-form #formCtrl>`과 별도)

> 상세: [`<sd-shared-data-select>`](../ui-form.md#sdshareddataselect)

```typescript
// 1) imports 추가
import { SdSharedDataSelect } from "@simplysm/angular";
// 앱 공용:
import { useSharedSignal } from "@adtek/client-common";

// 2) 클래스에 필드 추가
protected readonly permCopySourceId = signal<number | undefined>(undefined);
protected readonly sharedUsers = useSharedSignal("사용자");  // 앱 공용 provider

// 3) template — control 뷰의 <sd-dock>(상단 바) 내부, 또는 main 영역에 보조 form을 인라인한다.
//    아래는 control 뷰 분기 안에서 저장/새로고침/삭제 버튼과 같은 <sd-dock> 안에 추가하는 예시.
@if (viewType() === "control" && canEdit()) {
  <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <!-- 기본 저장/새로고침/삭제 버튼 (확장 D) -->
    <!-- ... -->

    <!-- 보조 기능: 다른 사용자로부터 가져오기 -->
    <sd-form (formSubmit)="onImportFormSubmit()">
      <div class="form-box-inline">
        <div class="form-box-item">
          <label>가져오기</label>
          <sd-shared-data-select
            [items]="sharedUsers.items()"
            [(value)]="permCopySourceId"
            [inset]="true"
            [size]="'sm'"
          />
        </div>
        <div class="form-box-item">
          <sd-button [type]="'submit'" [disabled]="permCopySourceId() == null">
            가져오기
          </sd-button>
        </div>
      </div>
    </sd-form>
  </sd-dock>
}

// 4) 메서드 추가
protected async onImportFormSubmit(): Promise<void> {
  if (this.busyCount() > 0 || !this.perms().includes("edit")) return;
  if (this.permCopySourceId() == null) return;
  if (!this._checkIgnoreChanges()) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 서버 호출로 다른 사용자의 데이터를 조회 — 예:
    //   const src = await this._api.fetchByIdAsync(this.permCopySourceId()!);
    //   this.data.set({ ...this.data(), ...src });
  });
  this.busyCount.update((v) => v - 1);
}
```

**포인트:**

- 보조 `<sd-form>`과 메인 `<sd-form #formCtrl>`은 **별도의 form**이다. 보조 form의 submit 버튼은 Ctrl+S와 연동되지 않는다(`SdCommandDirective`의 `sdSaveCommand`는 메인 `formCtrl`의 `requestSubmit()`에만 연결).
- 보조 form의 작업 후에도 `_checkIgnoreChanges()`를 호출하여 메인 폼의 미저장 변경사항을 보호한다.
- 출력·엑셀 다운로드 같은 read-only 보조 기능은 `formSubmit` 대신 버튼의 `(click)`으로 처리 가능. 이 경우 `<sd-form>` 래핑은 생략한다.

## 10. 확장 F: 복합 상세 (내부 `<sd-sheet>`)

확장 A(편집/저장)를 전제로, 상세 폼 안에 **하위 컬렉션**(박스 목록, 품목 라인 등)을 편집하는 구조를 도입한다. `<sd-form>` 본문 내부에 `<sd-sheet>`를 중첩하고, 하위 컬렉션의 행 추가·수정·삭제는 `item.isDeleted = true` 플래그로 soft-delete하여 `ArrayOneWayDiffResult` 기반 일괄 저장에 포함시킨다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdAnchor`(신규 행 삭제 아이콘), `mark`, `Uuid`, `oneWayDiffs`(side-effect import), `tablerCirclePlus`
- **데이터 타입 확장:** `ICustomer.boxes: ICustomerBox[]` + `interface ICustomerBox { id: string; seq: number; note: string; isDeleted: boolean; }`
- **시트 함수 (클래스 필드):** `boxTrackByFn`, `getBoxCellStyleFn`
- **메서드:** `onAddBoxButtonClick`, `onToggleDeleteBoxButtonClick`
- **템플릿:** main 영역 `<sd-form>` 내부에 하위 컬렉션 도구 영역(`<sd-button>` "박스 추가") + `<sd-sheet>` 중첩 (§3 최소 뼈대의 `<sd-form>` 내부 단일 필드 블록 아래에 추가)
- **onSubmit 변경:** `_sdToast.try(...)` 블록 내부를 diff 계산(`data().boxes.oneWayDiffs(_snapshot?.boxes, "id")`) + 일괄 제출로 교체

> 상세: [`<sd-sheet>`](../ui-data.md#sdsheet) · [`<sd-sheet-column>`](../ui-data.md#sdsheetcolumn) · [`[cell]`](../ui-data.md#sdsheetcolumncelltemplate) · [`<sd-anchor>`](../ui-form.md#sdanchor) · [`mark`](../utils.md#mark)

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
- 시트 셀 내부 컨트롤은 **`[inset]="true" [size]="'sm'"` 명시 필수** (§13 규칙 1 참조).
- `data().boxes.push(newBox)` 같은 배열 mutation 후에는 `mark(this.data)`로 signal 참조를 갱신해야 OnPush 템플릿이 재렌더링된다(§13 규칙 2 참조).
- `id`는 **클라이언트에서 UUID로 생성**하여 `trackByFn` + `oneWayDiffs`의 key로 사용. 서버가 발급한 PK가 별도로 있다면 별도 컬럼으로 관리하고 클라이언트 UUID는 row 식별자로만 사용.

## 11. 뷰 타입 분기

세 뷰(page / modal / control)는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 페이지·모달·컨트롤별로 별도 블록을 전체 복제하지 않는다. 최소 뼈대(§3)는 page 뷰만 커버하며, modal 뷰 블록은 [확장 C](#7-확장-c-modal-뷰), control 뷰 블록은 [확장 D](#8-확장-d-control-뷰)에서 각각 도입한다.

| 뷰 | topbar | dock (도구 바) | main (form) | 도입 확장 |
|---|---|---|---|---|
| page | `<sd-topbar>` (저장/삭제/복구/새로고침) | 없음 | form + 최종수정 | §3 최소 뼈대 + 확장 A·B |
| modal | 없음 (page topbar는 `@if (viewType() === "page")` 래핑) | `<sd-dock [position]="'bottom'">` (삭제·복구 + 취소·확인) | 동일 | [확장 C](#7-확장-c-modal-뷰) |
| control | 없음 | `<sd-dock>` 상단 (저장/새로고침/삭제/복구) | 동일 | [확장 D](#8-확장-d-control-뷰) |

```html
<sd-topbar-container>
  @if (viewType() === "page") { <sd-topbar>...</sd-topbar> }
  <sd-dock-container>
    @if (viewType() === "control" && canEdit()) { <sd-dock>...</sd-dock> }
    @if (viewType() === "modal" && canEdit()) {
      <sd-dock [position]="'bottom'">...</sd-dock>
    }
    <!-- main: form + 최종수정 (모든 뷰 공통) -->
  </sd-dock-container>
</sd-topbar-container>
```

뷰별 상세 사항(모달 우측 상단 액션 / `<sd-dock>` position 명시 / modal 하단 확인·취소 바 / control 상단 바)은 각 확장 섹션의 "포인트" bullet을 참조:

- 모달 우측 상단 새로고침 액션 + `actionTplRef` setter 프록시 동작 → [§7 확장 C 포인트](#7-확장-c-modal-뷰)
- `<sd-dock [position]="'bottom'"` 필수 명시 + 하단 확인/취소/삭제 바 구성 → [§7 확장 C 포인트](#7-확장-c-modal-뷰)
- control 뷰 상단 바 구성(`[position]` 생략 — 기본 `"top"`) → [§8 확장 D 포인트](#8-확장-d-control-뷰)
- page/modal/control 뷰 판정 규칙(`injectViewTypeSignal()` 내부 로직) → [§8 확장 D 포인트](#8-확장-d-control-뷰)

## 12. 주의사항 (자주 하는 실수)

본 섹션은 뷰·확장에 관계 없이 공통으로 해당하는 주의사항만 남긴다. 확장 레이어와 직결된 주의사항(`obj.clone` 깊은 복제 / `isNew` PK 형태 / 조용한 저장 / 커스텀 close 결과 / `setupCanDeactivate` modal 이탈 허용 등)은 [§5 확장 A "포인트"](#5-확장-a-편집저장) / [§7 확장 C "포인트"](#7-확장-c-modal-뷰)에서 각각 다룬다.

### 공통 유틸 재도입 금지

- `useDataDetail()`, `useCrudDetail()`, `setupDataDetail()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다.

### `_sdSharedData.wait()` 선택적 호출

- 과거 `SdDataDetailBase`는 `_refresh()` 직전에 `await this._sdSharedData.wait()`를 호출했다. **공유 데이터를 화면에서 실제로 사용하지 않는다면 이 호출은 불필요**. 사용한다면 `_refresh()` 맨 앞에 `await inject(SdSharedDataProvider).wait();`를 삽입한다.

### `effect` 내부 `untracked`

- `effect(() => { this.itemId(); ... })` 안에서 비동기 `_refresh()`를 호출할 때 반드시 `void untracked(async () => { ... await this._refresh(); ... })`로 감싼다. 그렇지 않으면 `_refresh` 내부의 signal 읽기(인라인된 ORM 조회 포함)가 effect 의존성으로 등록되어 무한 루프가 발생한다.

### `setupCanDeactivate`는 생성자에서만

- `setupCanDeactivate`는 `inject()`를 사용하므로 **생성자(또는 필드 이니셜라이저)**에서만 호출해야 한다. `computed`/`effect` 콜백 또는 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다.

### `injectViewTypeSignal()` 호출 시점

- 동일하게 `injectViewTypeSignal()`도 생성자 또는 필드 이니셜라이저에서만 호출한다.

### `busyMessage`는 필요할 때만 추가

- 기본 예제는 `<sd-busy-container [busy]="busyCount() > 0">`만 사용하고 `busyMessage` signal을 두지 않는다. 짧은 CRUD 작업은 progress 아이콘만으로 충분하기 때문.
- 오래 걸리는 작업(대량 저장·삭제, 파일 업로드, 집계 등) 구간에 진행 문구가 필요하면 **필요한 화면에만** 다음을 추가한다:
  ```typescript
  protected readonly busyMessage = signal<string | undefined>(undefined);
  ```
  ```html
  <sd-busy-container [busy]="busyCount() > 0" [message]="busyMessage()">
  ```
  ```typescript
  // onSubmit / _toggleDelete 등
  this.busyCount.update((v) => v + 1);
  this.busyMessage.set("저장 중...");
  await this._sdToast.try(async () => {
    // 단계가 여러 개면 구간마다 set 갱신
    this.busyMessage.set("하위 항목 정리 중...");
    // ...
  });
  this.busyMessage.set(undefined);
  this.busyCount.update((v) => v - 1);
  ```
- 진행 문구가 필요 없는 화면에 "혹시 몰라서" 선언·바인딩을 넣지 않는다. 미사용 필드로 남는다.

## 13. 레시피 작성 관용 규칙

향후 데이터 관련 레시피(CRUD 리스트·상세·선택 버튼 등) 전반에서 아래 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

> 상세: [셀 내용 작성 지침](../ui-data.md#sdsheetcolumncelltemplate)

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다.
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략.
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다.

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

> 상세: [`mark` — 역할·주의사항](../utils.md#mark)

- `mark(sig)`는 `WritableSignal`의 값을 shallow copy하여 **참조를 갱신**한다 (배열: `[...v]`, 객체: `{...v}`).
- 역할: **OnPush 템플릿 재렌더링** + **다른 computed / effect의 의존성 갱신**.
- **"저장 감지"가 아니다.** `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)이 deep equal로 snapshot과 값 차이를 감지하므로, `data().field = value` 같은 mutation은 `mark` 없이도 `_checkIgnoreChanges()` / `onSubmit()`의 snapshot 비교에서 감지된다.
- Chrome 61 호환성(Proxy 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 호출이 필요.
- ❌ "mark 없으면 저장이 안 된다" 식 서술 금지.

### 규칙 3: `setupCanDeactivate`는 뷰 타입에 따라 분기

- 모달 뷰에서는 `SdActivatedModalProvider.canDeactivateFn`에 등록되고, 페이지 뷰에서는 라우트 guard로 등록된다. control 뷰에서는 아무 동작 하지 않는다 (`sd-data-detail.base.ts:99` + `setupCanDeactivate.ts:5`).
- 레시피는 확장 C(modal 뷰)가 적용되면 `setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges())` 형태로 호출한다. 모달에서는 `true`를 돌려 항상 이탈 허용하고(모달 자체 취소 버튼으로 제어), 페이지에서는 `_checkIgnoreChanges()`의 confirm 결과로 제어.

## 부록 A. 풀 스택 합본 완성본

**확장 A + B + C + D 누적 적용** — page + modal + control 3뷰 지원 + 편집/저장 + 삭제/복구. LLM이 3뷰 모두 지원하는 상세 폼을 만들 때 **복사 시작점**으로 사용한다. (확장 E 보조 기능 / 확장 F 복합 상세는 도메인별 고유이므로 합본에 포함하지 않음 — 필요 시 [§9](#9-확장-e-보조-기능-영역) / [§10](#10-확장-f-복합-상세-내부-sd-sheet) 스니펫을 덧붙임)

```typescript
import { NgIcon } from "@ng-icons/core";
import {
  tablerAlertTriangle,
  tablerDeviceFloppy,
  tablerEraser,
  tablerRefresh,
  tablerRestore,
} from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { type DateTime, obj } from "@simplysm/core-common";
import {
  FormatPipe,
  injectCurrentPageCodeSignal,
  injectFullPageCodeSignal,
  injectPermsSignal,
  injectViewTitleSignal,
  injectViewTypeSignal,
  SdActivatedModalProvider,
  SdAnchor,
  SdAppStructureProvider,
  SdBusyContainer,
  SdButton,
  SdCommandDirective,
  SdDock,
  SdDockContainer,
  SdForm,
  type SdModalContentDef,
  SdSystemLogProvider,
  SdTextfield,
  SdToastProvider,
  SdTopbar,
  SdTopbarContainer,
  setupCanDeactivate,
} from "@simplysm/angular";
// 앱별 대체: ORM provider + DbContext. simplysm 패키지가 아니라 각 앱이 소유한다.
import { AppOrmProvider } from "@adtek/client-common";

interface ICustomer {
  id: number | undefined;           // undefined면 신규
  name: string;
  phone: string;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}

@Component({
  selector: "app-customer-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdDockContainer, SdDock,
    SdForm, SdButton, SdAnchor, SdTextfield,
    FormatPipe, NgIcon,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (initialized()) {
        @if (!perms().includes("use")) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br /><br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else {
          <sd-topbar-container>
            @if (viewType() === "page") {
              <sd-topbar>
                <h4>{{ modalOrPageTitle() }}</h4>
                @if (canEdit()) {
                  <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">
                    <ng-icon [svg]="tablerDeviceFloppy" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                }
                @if (!isNew() && canEdit()) {
                  @if (data().isDeleted) {
                    <sd-button [theme]="'link-warning'" (click)="onRestoreButtonClick()">
                      <ng-icon [svg]="tablerRestore" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [theme]="'link-danger'" (click)="onDeleteButtonClick()">
                      <ng-icon [svg]="tablerEraser" />
                      삭제
                    </sd-button>
                  }
                }
                <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                  <ng-icon [svg]="tablerRefresh" />
                  새로고침
                  <small>(CTRL+ALT+L)</small>
                </sd-button>
              </sd-topbar>
            }

            <sd-dock-container>
              <!-- control 뷰 상단 바: 저장·새로고침·삭제·복구 -->
              @if (viewType() === "control" && canEdit()) {
                <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
                  <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
                    <ng-icon [svg]="tablerDeviceFloppy" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
                    <ng-icon [svg]="tablerRefresh" />
                    새로고침
                    <small>(CTRL+ALT+L)</small>
                  </sd-button>
                  @if (!isNew() && canEdit()) {
                    @if (data().isDeleted) {
                      <sd-button [theme]="'warning'" (click)="onRestoreButtonClick()">
                        <ng-icon [svg]="tablerRestore" />
                        복구
                      </sd-button>
                    } @else {
                      <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
                        <ng-icon [svg]="tablerEraser" />
                        삭제
                      </sd-button>
                    }
                  }
                </sd-dock>
              }

              <!-- modal 뷰 하단 바: 삭제/복구 + 취소/확인 -->
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

              <!-- main: form + 최종수정 -->
              <div class="flex-column fill">
                <sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-fill">
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
                        <tr>
                          <th>전화번호</th>
                          <td>
                            <sd-textfield
                              [type]="'text'"
                              [disabled]="!canEdit()"
                              [(value)]="data().phone"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </sd-form>
                @if (data().lastModifiedAt || data().lastModifiedBy) {
                  <div
                    class="p-sm-default"
                    [class.bg-theme-gray-lightest]="viewType() === 'modal'"
                  >
                    최종수정:
                    @if (data().lastModifiedAt) {
                      {{ data().lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
                    }
                    @if (data().lastModifiedBy) {
                      ({{ data().lastModifiedBy }})
                    }
                  </div>
                }
              </div>
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
  `,
})
export class CustomerDetail implements SdModalContentDef<boolean | undefined> {
  //== DI ==
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _sdToast = inject(SdToastProvider);
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdAppStructure = inject(SdAppStructureProvider);
  private readonly _sdSystemLog = inject(SdSystemLogProvider);

  //== input ==
  itemId = input<number>();

  //== viewChild ==
  protected readonly formCtrl = viewChild<SdForm>("formCtrl");
  private readonly _modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef });

  //== 라우팅 / 권한 ==
  private readonly _fullPageCode = injectFullPageCodeSignal();
  private readonly _currPageCode = injectCurrentPageCodeSignal();
  protected readonly viewTitle = injectViewTitleSignal();
  protected readonly viewType = injectViewTypeSignal();
  protected readonly perms = injectPermsSignal(
    () => ["sales.customer"],
    () => ["use", "edit"],
  );

  //== 상태 ==
  protected readonly busyCount = signal(0);
  protected readonly initialized = signal(false);
  protected readonly data = signal<ICustomer>({
    id: undefined,
    name: "",
    phone: "",
    isDeleted: false,
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  });
  protected readonly canEdit = computed(() => this.perms().includes("edit"));
  protected readonly isNew = computed(() => this.data().id == null);
  private _snapshot?: ICustomer;

  //== SdModalContentDef<boolean | undefined> 요구 필드 ==
  close = output<boolean | undefined>();
  // actionTplRef는 SdModal이 setter 프록시로 감싸므로 필드 선언만으로 충분
  actionTplRef?: TemplateRef<any>;

  //== 파생 ==
  protected readonly modalOrPageTitle = computed(() => {
    try {
      return (
        this._sdActivatedModal?.modalComponent()?.title() ??
        this._sdAppStructure.getTitleByFullCode(
          this._currPageCode?.() ?? this._fullPageCode(),
        )
      );
    } catch (err) {
      void this._sdSystemLog.writeAsync("warn", `title 계산 실패: ${String(err)}`);
      return "";
    }
  });

  //== 라이프사이클 ==
  constructor() {
    // 최초 진입 + itemId 변경 시 재조회.
    effect(() => {
      this.itemId(); // 의존성 등록
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    // 모달 뷰에서는 SdActivatedModal의 canDeactivateFn에, 페이지 뷰에서는 라우트 guard에 등록된다.
    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());

    // 모달 헤더 우측 액션 슬롯 브릿지 (control/page 뷰에선 _modalActionTpl이 렌더되지 않아 undefined)
    effect(() => {
      this.actionTplRef = this._modalActionTpl();
    });
  }

  //== 이벤트 핸들러 ==
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
      this.close.emit(true);

      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  protected async onDeleteButtonClick(): Promise<void> {
    await this._toggleDelete(true);
  }

  protected async onRestoreButtonClick(): Promise<void> {
    await this._toggleDelete(false);
  }

  //== 내부 메서드 ==
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
      this.close.emit(true);
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

  // 로드+snapshot만 담당. busy/try는 호출부에서 처리.
  private async _refresh(): Promise<void> {
    let data: ICustomer;
    if (this.itemId() == null) {
      data = {
        id: undefined, name: "", phone: "",
        isDeleted: false, lastModifiedAt: undefined, lastModifiedBy: undefined,
      };
    } else {
      // 앱별 ORM 조회 — 예:
      //   data = await this._appOrm.connectAsync(async (db) =>
      //     (await db.customer.where((it) => [expr.eq(it.id, this.itemId())]).single())!
      //   );
      throw new Error("구현 필요");
    }

    this.data.set(data);
    // 신규(id == null)면 스냅샷 저장 생략 — 변경사항 체크를 항상 통과시켜 저장 허용
    this._snapshot = data.id == null ? undefined : obj.clone(data);
  }

  //== 아이콘 ==
  protected readonly tablerAlertTriangle = tablerAlertTriangle;
  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerEraser = tablerEraser;
  protected readonly tablerRefresh = tablerRefresh;
  protected readonly tablerRestore = tablerRestore;
}
```

## 부록 B. 확장 매트릭스 표

각 확장이 **추가/변경하는 코드 항목**을 카테고리별로 정리. 최소 뼈대(§3)에 대한 누적 diff로 읽는다. `-` = 변경 없음, `+` = 추가, `~` = 교체, `-`(접두사) = 제거.

| 확장 | imports | DI | input·output | 상태 | computed | effect | 메서드 | hostDirectives | host | 템플릿 블록 |
|---|---|---|---|---|---|---|---|---|---|---|
| **최소 뼈대** | NgIcon, tabler{AlertTriangle,Refresh}, Component core (effect, inject, input, signal, untracked, ViewEncapsulation), type DateTime, FormatPipe, injectPermsSignal, injectViewTitleSignal, SdBusyContainer, SdButton, SdCommandDirective, SdForm, SdTextfield, SdToastProvider, SdTopbar/SdTopbarContainer, AppOrmProvider | AppOrmProvider, SdToastProvider | itemId = input<number>() | busyCount, initialized, data, perms, viewTitle | 없음 | 초기 effect (itemId 의존성) | onRefreshButtonClick, _refresh | SdCommandDirective outputs ["sdRefreshCommand"] | (sdRefreshCommand)="onRefreshButtonClick()" | busy-container → @if (initialized) → 권한 경고 else { topbar-container > topbar(조건 없이: 새로고침) + "flex-column fill" > form(readonly 필드 2) + lastModified 조건부 } |
| **A. 편집/저장** | +computed, +viewChild, +obj, +setupCanDeactivate, +tablerDeviceFloppy | 없음 | 없음 | +_snapshot (field) | +canEdit, +isNew | 없음 | +onSaveButtonClick, +onSubmit, +_checkIgnoreChanges, ~onRefreshButtonClick (변경사항 체크 추가), ~_refresh (snapshot 갱신) | +outputs ["sdSaveCommand"] | +(sdSaveCommand)="onSaveButtonClick()" | +viewChild #formCtrl, +topbar "저장" 버튼, ~필드 [readonly]="true" → [disabled]="!canEdit()", ~`<sd-form>` → `<sd-form #formCtrl (formSubmit)>`, +생성자 setupCanDeactivate, +권한 키 ["use", "edit"] |
| **B. 삭제/복구 토글** | +tablerEraser, +tablerRestore | 없음 | 없음 | 없음 (ICustomer에 isDeleted: boolean 추가) | 없음 | 없음 | +onDeleteButtonClick, +onRestoreButtonClick, +_toggleDelete | 없음 | 없음 | +topbar에 `@if (!isNew() && canEdit())` 삭제·복구 버튼 |
| **C. modal 뷰** | +output, +TemplateRef, +injectViewTypeSignal, +type SdModalContentDef, +SdActivatedModalProvider, +SdAppStructureProvider, +SdSystemLogProvider, +SdAnchor, +SdDockContainer, +SdDock, +injectCurrentPageCodeSignal, +injectFullPageCodeSignal | +SdActivatedModalProvider (optional), +SdAppStructureProvider, +SdSystemLogProvider, +_fullPageCode, +_currPageCode | +close = output<boolean \| undefined>() | +actionTplRef (field) | +viewType, +modalOrPageTitle | +actionTplRef 브릿지 effect | ~onSubmit·_toggleDelete에 close.emit(true) 추가, ~setupCanDeactivate 조건에 viewType()==="modal" \|\| 추가 | 없음 | 없음 | `implements SdModalContentDef<boolean \| undefined>`, ~기존 `<sd-topbar>`를 `@if (viewType()==="page")`로 래핑, ~viewTitle → modalOrPageTitle, +main 래퍼를 `<sd-dock-container>`로 감싸고 modal 하단 바 추가, +`<ng-template #modalActionTpl>` |
| **D. control 뷰** | (확장 C가 이미 도입한 injectViewTypeSignal·SdDockContainer·SdDock·아이콘 재사용) | 없음 | 없음 | 없음 | (확장 C 없이 단독 적용 시 +viewType) | 없음 | 없음 | 없음 | 없음 | +`<sd-dock-container>` 내부에 `@if (viewType()==="control" && canEdit())` 상단 바 |
| **E. 보조 기능 영역** | +SdSharedDataSelect, +앱 공용 useSharedSignal | 없음 | 없음 | +예시 signal (permCopySourceId 등), +sharedUsers (useSharedSignal) | 없음 | 없음 | +onImportFormSubmit | 없음 | 없음 | +control/modal 뷰 dock 또는 main 영역에 보조 `<sd-form (formSubmit)>` 블록 |
| **F. 복합 상세** | +SdSheet, +SdSheetColumn, +SdSheetColumnCellTemplate, +SdAnchor(이미 C), +mark, +Uuid, +tablerCirclePlus, +side-effect "@simplysm/core-common" (oneWayDiffs) | 없음 | 없음 | (ICustomer에 boxes, interface ICustomerBox 추가) | 없음 | 없음 | +boxTrackByFn, +getBoxCellStyleFn, +onAddBoxButtonClick, +onToggleDeleteBoxButtonClick, ~onSubmit 내부를 diff 계산 + 일괄 제출로 교체 | 없음 | 없음 | ~main 영역 `<sd-form>` 내부에 하위 컬렉션 도구(박스 추가) + `<sd-sheet>` 중첩 |

범례:

- **누적 규칙**: 왼쪽 행(최소 뼈대 → A → B → C → D)을 세로로 누적하면 [부록 A 풀 스택 합본](#부록-a-풀-스택-합본-완성본)이 된다.
- **확장 A는 최소 뼈대의 전제**(편집/저장이 확장 B·C·D·E·F 모두의 기반).
- **확장 B는 확장 A가 전제**(삭제 버튼의 `@if (!isNew() && canEdit())` 조건이 확장 A의 `isNew`·`canEdit`에 의존).
- **확장 C와 확장 D는 상호 배타 분기**이지만 **병행 가능** — 두 `@if (viewType() === "...")` 블록이 같은 `<sd-dock-container>` 내부에 공존 가능(부록 A 풀 스택 합본이 이 구조).
- **확장 E·F는 도메인별 고유**이므로 부록 A에 포함하지 않는다. 각 확장 섹션에서 단독으로 조립.

## 이관 후보 목록

> 본 레시피 내 MOVE 표식(`<!-- MOVE: docs/*.md#anchor -->`)의 이관 작업 체크리스트. 2차 Feature 3.x에서 각 항목을 `[x]`로 체크하며 진행한다. 각 항목은 "해당 API의 단독 사용법을 `docs/*.md`로 이관 + 각 API 섹션 끝에 본 레시피로 역링크 추가 + 본 레시피의 MOVE 표식 블록을 축약 링크로 대체 + 이관 후보 체크"를 포함한다.

### docs/ui-data.md (Feature 3.1)

- [x] `<sd-sheet>` 기본 사용법 — `items` / `trackByFn` / `getItemCellStyleFn` (확장 F 하위 컬렉션)
- [x] `<sd-sheet-column>` — `key` / `header` / `fixed` (확장 F)
- [x] `<sd-sheet-column>` `[cell]` template context (`let-item`) (확장 F)
- [x] `<sd-sheet-column>` `#headerTpl` 커스텀 헤더 템플릿 (확장 F 삭제 아이콘 헤더)
- [x] 시트 셀 내부 컨트롤의 `[inset]="true" [size]="'sm'"` 규칙 (§13 규칙 1 → sd-sheet 주의사항으로 이관)

### docs/ui-form.md (Feature 3.1)

- [x] `<sd-form>` 기본 사용법 — 읽기 전용 필드 배치 컨테이너 (최소 뼈대 §3)
- [x] `<sd-form>` `(formSubmit)` + `requestSubmit()` + `#formCtrl` 템플릿 변수 (확장 A)
- [x] `<sd-textfield>` — form 내 사용 (`[readonly]="true"` / `[disabled]` / `[required]` / `[(value)]` / `[inset]` / `[size]`) (최소 뼈대 §3 / 확장 A / 확장 F)
- [x] `<sd-button>` theme (`link-*` / `primary` / `danger` / `warning` / `success` / `info` / `gray`) + `[size]="'sm'"` + `[theme]="'link-info'"` 등 + `[type]="'submit'"` (최소 뼈대 §3 / 확장 A / 확장 B / 확장 C / 확장 D)
- [x] `<sd-anchor>` 인라인 버튼 + theme(`gray` / `danger`) (확장 C modal 우측 상단 액션 / 확장 F 행 삭제 아이콘)
- [x] `<sd-shared-data-select>` + 앱 공용 `useSharedSignal` 패턴 — 보조 form 셀렉터 (확장 E). **신규 앵커 생성 대상**

### docs/ui-layout.md (Feature 3.1)

- [x] `<sd-dock-container>` + `<sd-dock>` 기본 사용 패턴 (확장 C / 확장 D)
- [x] `<sd-dock>` `[position]` input 값 (`"top"` 기본, `"bottom"` / `"left"` / `"right"`). **modal 하단 바는 `[position]="'bottom'"` 반드시 명시** 주의사항 포함 (확장 C)

### docs/ui-overlay.md (Feature 3.1)

- [x] `<sd-busy-container>` input: `[busy]` / `[message]` / `[type]` (최소 뼈대 §3)
- [x] `busyCount` 카운트 패턴 (호출부에서 `busyCount.update((v) => v + 1)` / `- 1`, `busyCount() > 0`로 busy 표시) (최소 뼈대 §3)
- [x] `busyMessage` 선택적 사용 패턴 (긴 작업 시, §12 주의사항에서 언급)

### docs/ui-navigation.md (Feature 3.1)

- [x] `<sd-topbar-container>` + `<sd-topbar>` 기본 패턴 — 최소 뼈대는 조건 없이 렌더, 확장 C에서 `@if (viewType() === "page")`로 래핑 (최소 뼈대 §3 / 확장 C)
- [x] topbar 내부 슬롯 활용 (`<h4>` 제목, 버튼 배치, `<small>` 단축키 표시) (최소 뼈대 §3 / 확장 A / 확장 B)

### docs/utils.md (Feature 3.6)

- [x] `injectViewTypeSignal()` — 호출 시점 제약(생성자/필드 이니셜라이저만, `NG0203`), 자동 판정 규칙(page / modal / control), 수동 오버라이드 패턴 (확장 C / 확장 D / §12 주의사항)
- [x] `injectViewTitleSignal()` 사용법 (최소 뼈대 §3)
- [x] `injectCurrentPageCodeSignal()` / `injectFullPageCodeSignal()` 사용법 — 현재 라우트 코드 / 전체 라우트 코드 signal (확장 C modalOrPageTitle 계산)
- [x] `setupCanDeactivate(guardFn)` 가드 함수 패턴, 라우트 이탈 / 모달 close 시 동작 + 뷰 타입별 분기(`viewType() === "modal"` 단락으로 이탈 허용) (확장 A / 확장 C / §13 규칙 3)
- [x] `mark(sig)` 의미 (shallow copy로 참조 갱신 → OnPush 재렌더 + computed/effect 의존성 갱신). **"저장 감지가 아니다"** 명시 (§13 규칙 2 → mark 주의사항으로 이관)
- [x] `injectPermsSignal(viewCodes, keys)` 사용 예, 반환 signal 구조 (최소 뼈대 §3) — D1 결정: providers.md 대신 utils.md로 이관

### docs/provider-types.md (Feature 3.7)

- [x] `SdModalContentDef<R>` 인터페이스 구현 방법 — `close = output<R>()` / `actionTplRef?: TemplateRef<any>` / 호출 측에서 `await sdModal.showAsync<R>(...)`로 결과 수신 (확장 C). **신규 앵커 생성 대상**

### docs/providers.md (Feature 3.8)

- [x] `injectPermsSignal(viewCodes, keys)` 사용 예, 반환 signal 구조 (최소 뼈대 §3)
- [x] `SdToastProvider.try(fn, messageFn?)` 에러 래퍼 사용법 (반환 타입, 에러 시 자동 토스트) (최소 뼈대 §3)
- [x] `SdActivatedModalProvider` — 모달 내부에서만 주입, `modalComponent()` / `canDeactivateFn` 필드 (확장 C)
- [x] `SdModalProvider.showAsync({ type, inputs, title, ... }, options?)` 호출 패턴 — modal 뷰 호출 예 (`inputs: { itemId }`, 반환값 `boolean | undefined`로 저장 결과 수신) (확장 C)

---

## Cross-reference

- CRUD 리스트(시트) 화면 — `<sd-sheet>` 직접 조립 레시피. → [`crud-list.md`](./crud-list.md)
- 페이지/모달 컨테이너 분기 — → [`page-modal-container.md`](./page-modal-container.md)
- `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스. → [`../provider-types.md`](../provider-types.md)
- `SdModalProvider.showAsync()` — 프로그래밍 방식 모달 호출. → [`../providers.md`](../providers.md)
