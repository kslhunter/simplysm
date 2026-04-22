# Recipe: CRUD 상세폼 화면 직접 조립

> **CRITICAL: 뷰 범위 확인 선행**
> 이 레시피로 실제 화면을 생성하기 전, 지원할 뷰(page / modal / control)를 **반드시 사용자에게 질문**한다. 본 레시피는 **최소 뼈대(§3. 읽기 전용 상세 폼, page 뷰 전용) → 확장 A~F 누적** 구조로 구성된다. 필요한 확장만 선택적으로 얹고, 당장 쓰지 않는 뷰/확장의 분기·계약·`<ng-template #modalActionTpl>` 등은 **죽은 코드가 되므로 생성에서 제외**한다. modal 뷰는 [확장 C](./crud-detail/extension-c-modal-view.md)에서, control 뷰(마스터-디테일의 디테일 영역)는 [확장 D](./crud-detail/extension-d-control-view.md)에서 각각 다룬다. 추측으로 3뷰를 모두 박지 않는다.

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
- **확장이 도입하는 요소**는 각 확장 문서(A~F) 서두에서 명시한다. 각 확장이 추가/변경하는 코드 항목 요약은 [부록 B. 확장 매트릭스 표](#부록-b-확장-매트릭스-표)에서 한눈에 확인할 수 있다.
- **제거된 추상화:** `SdDataDetail`(컴포넌트) / `SdDataDetailBase<T, R>`(추상 클래스) / `SdDataDetailDataInfo`(타입) / `#toolTpl`·`#prevTpl`·`#contentTpl`·`#nextTpl`·`#modalActionTpl` 슬롯 5종. 대체: 소비 컴포넌트가 표준 조각을 직접 조립.
- **데이터 비교:** `obj.clone(this.data())` snapshot 복제 + `obj.equal(a, b)` deep equal (`@simplysm/core-common`). 확장 A에서 도입.

## 2. 언제 사용하는가

| 상황 | 시작 지점 + 필요한 확장 |
|---|---|
| 단일 레코드 **읽기 전용 상세 폼** (page 뷰, 감사 필드 표시) | §3 최소 뼈대만 |
| 편집/저장 가능한 단일 레코드 상세 폼 | §3 + [확장 A](./crud-detail/extension-a-edit-save.md) |
| 삭제/복구 토글 포함 | §3 + 확장 A + [확장 B](./crud-detail/extension-b-delete-restore.md) |
| 페이지 뷰와 **modal 뷰**(확인·취소·삭제·복구 하단 바) 모두에서 재사용 | §3 + 확장 A + 확장 B + [확장 C](./crud-detail/extension-c-modal-view.md) |
| 마스터-디테일의 "디테일" 영역 (**control 뷰**) | §3 + 확장 A + 확장 B + [확장 D](./crud-detail/extension-d-control-view.md) |
| page + modal + control **3뷰** 모두 지원 | §3 + 확장 A + 확장 B + 확장 C + 확장 D |
| 메인 폼과 별개의 "가져오기/출력" **보조 기능** 필요 | §3 + 확장 A + [확장 E](./crud-detail/extension-e-auxiliary.md) |
| 상세 폼 내부에 **하위 컬렉션** 편집 (박스 목록 등) | §3 + 확장 A + [확장 F](./crud-detail/extension-f-complex-detail.md) |
| CRUD 리스트(시트) 화면 | 본 레시피 대신 [`crud-list.md`](./crud-list.md) 사용 |
| 페이지/모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 최소 뼈대: 읽기 전용 상세 폼

아래는 **읽기 전용 상세 폼(page 뷰)** 기준의 최소 뼈대 완성 컴포넌트다. 라우트로 진입하면 `itemId`를 받아 단일 레코드를 로드하고 읽기 전용 필드로 표시한다. 편집·삭제·modal·control·보조·복합이 필요하면 [§5 확장 A ~ §10 확장 F](#5-확장-a-편집저장)를 선택적으로 얹는다.

> **조건부 요소 안내:** 아래 최소 뼈대는 "routes 페이지 + DB 조회 + 권한 체크"를 갖춘 전형적 구성 기준이다. 각 요소의 포함 조건은 [§4 조건부 요소 포함 기준](#조건부-요소-포함-기준)에서 확인하며, 해당하지 않는 요소는 생략한다. 최소 뼈대는 **page 뷰 전용**이므로 `injectViewTypeSignal()`을 사용하지 않고 `<sd-topbar>`를 조건 없이 렌더한다. modal/control 뷰가 필요하면 [확장 C](./crud-detail/extension-c-modal-view.md) / [확장 D](./crud-detail/extension-d-control-view.md)에서 `injectViewTypeSignal()`과 분기를 도입한다.

본 섹션에 등장하는 개별 API의 단독 사용법:

- [`<sd-busy-container>`](../ui-overlay/sd-busy-container.md) — busy 오버레이 + [busyCount 패턴](../ui-overlay/sd-busy-container.md#busycount-카운트-패턴)
- [`<sd-topbar-container>` · `<sd-topbar>`](../ui-navigation/sd-topbar-container.md) — 탑바 + [슬롯 활용](../ui-navigation/sd-topbar-container.md#topbar-내부-슬롯-활용)
- [`<sd-form>`](../ui-form/sd-form.md) — 폼 래퍼 (읽기 전용 필드 배치)
- [`<sd-textfield>`](../ui-form/sd-textfield.md) · [`<sd-button>`](../ui-form/sd-button.md) — 텍스트 입력 · 버튼
- [`injectViewTitleSignal`](../utils/inject-routing-signals.md#injectviewtitlesignal) · [`injectPermsSignal`](../utils/inject-routing-signals.md#injectpermssignal) · [`SdToastProvider.try`](../providers/sd-toast-provider.md#try-사용-패턴)

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
  perms = injectPermsSignal(["sales.customer"], ["use"]);

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

  //== for Template ==
  protected readonly tablerAlertTriangle = tablerAlertTriangle;
  protected readonly tablerRefresh = tablerRefresh;
}
```

## 4. 최소 뼈대 분해 설명

### 조건부 요소 포함 기준

최소 뼈대의 인프라·라이프사이클 요소는 화면의 필요에 따라 포함/생략한다. 필요 없는 요소를 기계적으로 포함하지 않는다.

| 요소 | 포함 조건 | 생략하는 경우 예시 |
|------|----------|-------------------|
| `<sd-topbar-container>` + `<sd-topbar>` | routes로 연결된 페이지에서 헤더를 표시할 때. 최소 뼈대는 page 전용이므로 조건 없이 렌더 | route 미연결 컴포넌트(control, 래퍼 등) |
| `injectViewTitleSignal()` | 타이틀이 필요할 때. topbar에 타이틀을 표시하는 page에는 보통 포함 | topbar가 없거나 타이틀 표시가 불필요한 화면 |
| `injectViewTypeSignal()` + viewType 가드 | page 외에 modal 또는 control로도 **겸용**될 때. **최소 뼈대는 page 전용이므로 미포함** — [확장 C](./crud-detail/extension-c-modal-view.md)/[확장 D](./crud-detail/extension-d-control-view.md)에서 도입 | page 전용 상세폼 |
| `injectPermsSignal()` + 권한 없음 메시지 | 권한 제어가 있는 화면. 권한 제어 자체가 있으면 필수 | 권한 제어가 없는 화면 |
| `<sd-busy-container>` + `busyCount` | 화면에 비동기 작업(DB 조회, API 호출 등)이 있어서 busy 표시가 필요할 때 | 비동기 로딩 없이 동기적으로 렌더되는 래퍼/레이아웃 화면 |
| `initialized` + `@if (initialized())` 가드 | 초기 데이터 로딩이 완료되기 전에는 화면을 그리면 안 되는 경우 (깜박임 방지) | 초기 로딩이 필요 없거나, 빈 상태로 보여줘도 무방한 화면 |

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

> **확장이 도입하는 블록·상태·메서드** (예: `canEdit` / `_dataSnapshot` / `isNew` / `onSubmit` / `_toggleDelete` / `close` output / modal 하단 바 / control 상단 바 / 보조 form / 내부 `<sd-sheet>` 등)는 [§5 확장 A ~ §10 확장 F](#5-확장-a-편집저장) 각 확장 섹션의 "이 확장이 도입하는 요소" bullet + "포인트" bullet에서 다룬다. A+B+C+D 누적된 완성본은 [부록 B. 확장 매트릭스 표](#부록-b-확장-매트릭스-표)에서 한눈에 확인 가능.

## 5. 확장 A: 편집/저장

최소 뼈대의 읽기 전용 필드를 편집 가능으로 바꾸고, 저장 버튼 + Ctrl+S 일괄 저장을 추가한다. snapshot 기반 변경 감지 + `setupCanDeactivate` 가드 부착.

- **선행:** 없음 (최소 뼈대에 직접 얹음)
- **도입 요소:** `canEdit`, `isNew`, `_dataSnapshot`, `mark`, `setupCanDeactivate`, `onSubmit`, `_checkIgnoreChanges` 등
- **줄 수:** 196줄

→ **[상세 문서](./crud-detail/extension-a-edit-save.md)**

## 6. 확장 B: 삭제/복구 토글

기존 레코드에 대한 soft-delete 토글(삭제/복구 버튼)을 추가한다. `isDeleted: boolean` 필드 도입.

- **선행:** [확장 A](./crud-detail/extension-a-edit-save.md)
- **도입 요소:** `onDeleteButtonClick`, `onRestoreButtonClick`, `_toggleDelete`, `isDeleted` 필드
- **줄 수:** 95줄

→ **[상세 문서](./crud-detail/extension-b-delete-restore.md)**

## 7. 확장 C: modal 뷰

동일 컴포넌트를 modal 뷰로도 재사용한다. `SdModalContentDef` 계약 부착 + 하단 액션 바 + 모달 우측 상단 새로고침.

- **선행:** [확장 A](./crud-detail/extension-a-edit-save.md) + [확장 B](./crud-detail/extension-b-delete-restore.md)
- **도입 요소:** `implements SdModalContentDef<boolean | undefined>`, `close` output, `viewType`, `modalOrPageTitle`, modal 하단 dock, `actionTplRef`
- **줄 수:** 194줄

→ **[상세 문서](./crud-detail/extension-c-modal-view.md)**

## 8. 확장 D: control 뷰

동일 컴포넌트를 control 뷰(마스터-디테일의 디테일 영역)로도 재사용한다. 상단 바에 저장·새로고침·삭제·복구.

- **선행:** [확장 A](./crud-detail/extension-a-edit-save.md) + [확장 B](./crud-detail/extension-b-delete-restore.md)
- **도입 요소:** `viewType`, control 뷰 상단 `<sd-dock>`, 확장 C와 병행 가능
- **줄 수:** 63줄

→ **[상세 문서](./crud-detail/extension-d-control-view.md)**

## 9. 확장 E: 보조 기능 영역

메인 폼 submit과 별개인 보조 기능(권한 복사, 출력 등)을 추가한다. 별도 `<sd-form>` 배치.

- **선행:** [확장 A](./crud-detail/extension-a-edit-save.md)
- **도입 요소:** 보조 `<sd-form>`, `onImportFormSubmit`, `SdSharedDataSelect`
- **줄 수:** 74줄

→ **[상세 문서](./crud-detail/extension-e-auxiliary.md)**

## 10. 확장 F: 복합 상세 (내부 `<sd-sheet>`)

상세 폼 안에 하위 컬렉션(박스 목록, 품목 라인 등)을 편집하는 구조를 도입한다. `oneWayDiffs` 기반 일괄 저장.

- **선행:** [확장 A](./crud-detail/extension-a-edit-save.md)
- **도입 요소:** `SdSheet`/`SdSheetColumn` 중첩, `boxTrackByFn`, `onAddBoxButtonClick`, `oneWayDiffs` diff 계산
- **줄 수:** 183줄

→ **[상세 문서](./crud-detail/extension-f-complex-detail.md)**

## 11. 뷰 타입 분기

세 뷰(page / modal / control)는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 페이지·모달·컨트롤별로 별도 블록을 전체 복제하지 않는다. 최소 뼈대(§3)는 page 뷰만 커버하며, modal 뷰 블록은 [확장 C](./crud-detail/extension-c-modal-view.md), control 뷰 블록은 [확장 D](./crud-detail/extension-d-control-view.md)에서 각각 도입한다.

| 뷰 | topbar | dock (도구 바) | main (form) | 도입 확장 |
|---|---|---|---|---|
| page | `<sd-topbar>` (저장/삭제/복구/새로고침) | 없음 | form + 최종수정 | §3 최소 뼈대 + 확장 A·B |
| modal | 없음 (page topbar는 `@if (viewType() === "page")` 래핑) | `<sd-dock [position]="'bottom'">` (삭제·복구 + 취소·확인) | 동일 | [확장 C](./crud-detail/extension-c-modal-view.md) |
| control | 없음 | `<sd-dock>` 상단 (저장/새로고침/삭제/복구) | 동일 | [확장 D](./crud-detail/extension-d-control-view.md) |

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

뷰별 상세 사항(모달 우측 상단 액션 / `<sd-dock>` position 명시 / modal 하단 확인·취소 바 / control 상단 바)은 각 확장 문서의 "포인트" bullet을 참조:

- 모달 우측 상단 새로고침 액션 + `actionTplRef` setter 프록시 동작 → [확장 C 포인트](./crud-detail/extension-c-modal-view.md)
- `<sd-dock [position]="'bottom'"` 필수 명시 + 하단 확인/취소/삭제 바 구성 → [확장 C 포인트](./crud-detail/extension-c-modal-view.md)
- control 뷰 상단 바 구성(`[position]` 생략 — 기본 `"top"`) → [확장 D 포인트](./crud-detail/extension-d-control-view.md)
- page/modal/control 뷰 판정 규칙(`injectViewTypeSignal()` 내부 로직) → [확장 D 포인트](./crud-detail/extension-d-control-view.md)

## 12. 주의사항 (자주 하는 실수)

본 섹션은 뷰·확장에 관계 없이 공통으로 해당하는 주의사항만 남긴다. 확장 레이어와 직결된 주의사항(`obj.clone` 깊은 복제 / `isNew` PK 형태 / 조용한 저장 / 커스텀 close 결과 / `setupCanDeactivate` modal 이탈 허용 등)은 [확장 A "포인트"](./crud-detail/extension-a-edit-save.md) / [확장 C "포인트"](./crud-detail/extension-c-modal-view.md)에서 각각 다룬다.

### 공통 유틸 재도입 금지

- `useDataDetail()`, `useCrudDetail()`, `setupDataDetail()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다.

### 공유 데이터 사용 시 `_sdSharedData.wait()` 필수

- 화면에서 공유 데이터(`useSharedSignal`, `getHandle` 등)를 사용한다면, `_refresh()` 맨 앞에 **반드시** `await this._sdSharedData.wait();`를 호출한다. 공유 데이터 로딩이 완료되기 전에 화면을 렌더하면 셀렉트 드롭다운 등이 비어있는 상태로 표시된다.
- 공유 데이터를 사용하지 않는 화면에서는 불필요.

### `input()` 의존 데이터 로딩에 `void this._initAsync()` 금지

- `input()` / `input.required()` signal 값에 따라 데이터를 로드하는 컴포넌트에서, 생성자에서 `void this._initAsync()`를 호출하고 별도 메서드에서 비동기 로직을 수행하는 패턴은 **절대 사용하지 않는다.** 이 패턴은 최초 1회만 실행되어 input 변경에 반응하지 않는다.
- 반드시 `effect`로 input 의존성을 등록하고, 비동기 작업은 `void untracked(async () => { ... })`로 감싼다:
  ```typescript
  // ❌ input 변경에 반응하지 않음 — 최초 1회만 실행
  constructor() {
    void this._initAsync();
  }
  private async _initAsync(): Promise<void> { ... this.itemId() ... }

  // ✅ input 변경 시 자동 재실행
  constructor() {
    effect(() => {
      this.itemId(); // 의존성 등록 (untracked 바깥)
      void untracked(async () => { ... });
    });
  }
  ```
- 이 규칙은 최소 뼈대(§3)의 초기 effect, [확장 E(조회 전용 modal)](../crud-list/extension-e-readonly-modal.md)의 부모 식별자 input 등 **모든 input 의존 데이터 로딩에 공통**으로 적용된다.

### signal 필드 초기값에서 다른 signal 읽기 금지 + input → filter 동기화

- `signal()` 필드 이니셜라이저에서 `this.someInput()` 같은 **다른 signal을 읽어서는 안 된다.** 필드 이니셜라이저는 클래스 생성 시점에 실행되며, input signal은 아직 부모로부터 값을 전달받기 전이므로 항상 기본값만 반환한다.
- **초기값에서 빼는 것만으로는 부족하다.** input 값을 상태에 반영하는 로직이 반드시 effect 안에 있어야 한다. 상세는 [crud-list.md 동일 섹션](./crud-list.md#signal-필드-초기값에서-다른-signal-읽기-금지--input--filter-동기화) 참조.

### `effect` 내부 `untracked`

- `effect(() => { this.itemId(); ... })` 안에서 비동기 `_refresh()`를 호출할 때 반드시 `void untracked(async () => { ... await this._refresh(); ... })`로 감싼다. 그렇지 않으면 `_refresh` 내부의 signal 읽기(인라인된 ORM 조회 포함)가 effect 의존성으로 등록되어 무한 루프가 발생한다.

### `setupCanDeactivate`는 생성자에서만

- `setupCanDeactivate`는 `inject()`를 사용하므로 **생성자(또는 필드 이니셜라이저)**에서만 호출해야 한다. `computed`/`effect` 콜백 또는 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다.

### `injectViewTypeSignal()` 호출 시점

- 동일하게 `injectViewTypeSignal()`도 생성자 또는 필드 이니셜라이저에서만 호출한다.

### page 컴포넌트가 `<sd-topbar>`를 소유한다

- 마스터-디테일 구조(시트 + 상세를 나란히 배치하는 페이지)에서 `<sd-topbar-container>` + `<sd-topbar>`(페이지 타이틀·주요 액션)는 **page 컴포넌트가 소유**한다. 임베딩되는 sheet/detail control 컴포넌트에 `<sd-topbar-container>`나 `<sd-topbar>`를 넣지 않는다.
  ```html
  <!-- ❌ page에 topbar 없이, control 컴포넌트가 topbar를 소유 -->
  <!-- Page -->
  <div class="flex-row fill">
    <app-sheet />
    <app-detail />  <!-- 내부에 <sd-topbar-container> 존재 -->
  </div>

  <!-- ✅ page가 topbar를 소유, control은 sd-dock-container만 사용 -->
  <!-- Page -->
  <sd-topbar-container>
    <sd-topbar><h4>{{ viewTitle() }}</h4> ...</sd-topbar>
    <div class="flex-row fill">
      <app-sheet />   <!-- 내부: <sd-dock-container> -->
      <app-detail />  <!-- 내부: <sd-dock-container> -->
    </div>
  </sd-topbar-container>
  ```
- control 뷰의 도구 바(저장·삭제 등)는 `<sd-dock-container>` + `<sd-dock>`으로 배치한다 ([확장 D](./crud-detail/extension-d-control-view.md) 참조).

### `SdCommandDirective` document 리스너 중복 주의

- `SdCommandDirective`는 **document 레벨** keydown 리스너를 등록한다 (`sd-command.ts:40`). 같은 화면에서 여러 컴포넌트에 부착하면 **모두 발동**된다 (모달 내부 판정(`shouldProcessCommandEvent`)만 거를 뿐, 형제 컴포넌트 간 구분은 없음).
- 따라서 **`_refresh()`/`onSubmit()`을 직접 소유하는 컴포넌��에서만** 부착한다. 자식 컴포넌트를 조합만 하는 page 래퍼, 권한 체크 + 레이아웃만 담당하는 컨테이너에는 부착하지 않는다.
- 마스터-디테일 구조에서 sheet와 detail **양쪽**에 `sdRefreshCommand`를 부착하면 Ctrl+Alt+L 시 양쪽 `_refresh()`가 동시에 실행된다. 의도된 동작이 아니면 한쪽에만 부착한다.

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

> 상세: [셀 내용 작성 지침](../ui-data/sd-sheet.md#sdsheetcolumncelltemplate)

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다.
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략.
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다.

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

> 상세: [`mark` — 역할·주의사항](../utils/mark.md)

- `mark(sig)`는 `WritableSignal`의 값을 shallow copy하여 **참조를 갱신**한다 (배열: `[...v]`, 객체: `{...v}`).
- 역할: **OnPush 템플릿 재렌더링** + **다른 computed / effect의 의존성 갱신**.
- **"저장 감지"가 아니다.** `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)이 deep equal로 snapshot과 값 차이를 감지하므로, `data().field = value` 같은 mutation은 `mark` 없이도 `_checkIgnoreChanges()` / `onSubmit()`의 snapshot 비교에서 감지된다.
- Chrome 61 호환성(Proxy 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 호출이 필요.
- ❌ "mark 없으면 저장이 안 된다" 식 서술 금지.

## 부록 B. 확장 매트릭스 표

각 확장이 **추가/변경하는 코드 항목**을 카테고리별로 정리. 최소 뼈대(§3)에 대한 누적 diff로 읽는다. `-` = 변경 없음, `+` = 추가, `~` = 교체, `-`(접두사) = 제거.

| 확장 | imports | DI | input·output | 상태 | computed | effect | 메서드 | hostDirectives | host | 템플릿 블록 |
|---|---|---|---|---|---|---|---|---|---|---|
| **최소 뼈대** | NgIcon, tabler{AlertTriangle,Refresh}, Component core (effect, inject, input, signal, untracked, ViewEncapsulation), type DateTime, FormatPipe, injectPermsSignal, injectViewTitleSignal, SdBusyContainer, SdButton, SdCommandDirective, SdForm, SdTextfield, SdToastProvider, SdTopbar/SdTopbarContainer, AppOrmProvider | AppOrmProvider, SdToastProvider | itemId = input<number>() | busyCount, initialized, data, perms, viewTitle | 없음 | 초기 effect (itemId 의존성) | onRefreshButtonClick, _refresh | SdCommandDirective outputs ["sdRefreshCommand"] | (sdRefreshCommand)="onRefreshButtonClick()" | busy-container → @if (initialized) → 권한 경고 else { topbar-container > topbar(조건 없이: 새로고침) + "flex-column fill" > form(readonly 필드 2) + lastModified 조건부 } |
| **A. 편집/저장** | +computed, +viewChild, +obj, +setupCanDeactivate, +mark, +tablerDeviceFloppy | 없음 | 없음 | +_dataSnapshot (field) | +canEdit, +isNew | 없음 | +onSaveButtonClick, +onSubmit, +_checkIgnoreChanges, ~onRefreshButtonClick (변경사항 체크 추가), ~_refresh (snapshot 갱신) | +outputs ["sdSaveCommand"] | +(sdSaveCommand)="onSaveButtonClick()" | +viewChild #formCtrl, +topbar "저장" 버튼, ~필드 [readonly]="true" → [disabled]="!canEdit()" + (valueChange)="mark(data)", ~`<sd-form>` → `<sd-form #formCtrl (formSubmit)>`, +생성자 setupCanDeactivate, +권한 키 ["use", "edit"] |
| **B. 삭제/복구 토글** | +tablerEraser, +tablerRestore | 없음 | 없음 | 없음 (ICustomer에 isDeleted: boolean 추가) | 없음 | 없음 | +onDeleteButtonClick, +onRestoreButtonClick, +_toggleDelete | 없음 | 없음 | +topbar에 `@if (!isNew() && canEdit())` 삭제·복구 버튼 |
| **C. modal 뷰** | +output, +TemplateRef, +injectViewTypeSignal, +type SdModalContentDef, +SdActivatedModalProvider, +SdAppStructureProvider, +SdSystemLogProvider, +SdAnchor, +SdDockContainer, +SdDock, +injectCurrentPageCodeSignal, +injectFullPageCodeSignal | +SdActivatedModalProvider (optional), +SdAppStructureProvider, +SdSystemLogProvider, +_fullPageCode, +_currPageCode | +close = output<boolean \| undefined>() | +actionTplRef (field) | +viewType, +modalOrPageTitle | +actionTplRef 브릿지 effect | ~onSubmit·_toggleDelete에 close.emit(true) 추가, ~setupCanDeactivate 조건에 viewType()==="modal" \|\| 추가 | 없음 | 없음 | `implements SdModalContentDef<boolean \| undefined>`, ~기존 `<sd-topbar>`를 `@if (viewType()==="page")`로 래핑, ~viewTitle → modalOrPageTitle, +main 래퍼를 `<sd-dock-container>`로 감싸고 modal 하단 바 추가, +`<ng-template #modalActionTpl>` |
| **D. control 뷰** | (확장 C가 이미 도입한 injectViewTypeSignal·SdDockContainer·SdDock·아이콘 재사용) | 없음 | 없음 | 없음 | (확장 C 없이 단독 적용 시 +viewType) | 없음 | 없음 | 없음 | 없음 | +`<sd-dock-container>` 내부에 `@if (viewType()==="control" && canEdit())` 상단 바 |
| **E. 보조 기능 영역** | +SdSharedDataSelect, +앱 공용 useSharedSignal | 없음 | 없음 | +예시 signal (permCopySourceId 등), +sharedUsers (useSharedSignal) | 없음 | 없음 | +onImportFormSubmit | 없음 | 없음 | +control/modal 뷰 dock 또는 main 영역에 보조 `<sd-form (formSubmit)>` 블록 |
| **F. 복합 상세** | +SdSheet, +SdSheetColumn, +SdSheetColumnCellTemplate, +SdAnchor(이미 C), +Uuid, +tablerCirclePlus, +side-effect "@simplysm/core-common" (oneWayDiffs) | 없음 | 없음 | (ICustomer에 boxes, interface ICustomerBox 추가) | 없음 | 없음 | +boxTrackByFn, +getBoxCellStyleFn, +onAddBoxButtonClick, +onToggleDeleteBoxButtonClick, ~onSubmit 내부를 diff 계산 + 일괄 제출로 교체 | 없음 | 없음 | ~main 영역 `<sd-form>` 내부에 하위 컬렉션 도구(박스 추가) + `<sd-sheet>` 중첩 |

범례:

- **누적 규칙**: 왼쪽 행(최소 뼈대 → A → B → C → D)을 세로로 누적하면 page + modal + control 3뷰 지원 풀 스택이 된다.
- **확장 A는 최소 뼈대의 전제**(편집/저장이 확장 B·C·D·E·F 모두의 기반).
- **확장 B는 확장 A가 전제**(삭제 버튼의 `@if (!isNew() && canEdit())` 조건이 확장 A의 `isNew`·`canEdit`에 의존).
- **확장 C와 확장 D는 상호 배타 분기**이지만 **병행 가능** — 두 `@if (viewType() === "...")` 블록이 같은 `<sd-dock-container>` 내부에 공존 가능.
- **확장 E·F는 도메인별 고유**이므로 각 확장 문서에서 단독으로 조립.

## Cross-reference

- CRUD 리스트(시트) 화면 — `<sd-sheet>` 직접 조립 레시피. → [`crud-list.md`](./crud-list.md)
- 페이지/모달 컨테이너 분기 — → [`page-modal-container.md`](./page-modal-container.md)
- `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스. → [`../provider-types/sd-modal-content-def.md`](../provider-types/sd-modal-content-def.md)
- `SdModalProvider.showAsync()` — 프로그래밍 방식 모달 호출. → [`../providers/sd-modal-provider.md`](../providers/sd-modal-provider.md)
