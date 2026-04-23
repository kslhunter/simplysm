# Recipe: CRUD 상세폼 화면 직접 조립

단일 레코드 CRUD 상세폼을, `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` 표준 컴포넌트를 소비 화면이 **직접 조립**하여 구성한다. 과거 `SdDataDetail` / `SdDataDetailBase`가 감추고 있던 load·save·delete 라이프사이클, snapshot 기반 변경 감지, 이탈 방지, busy 카운트, Ctrl+S/Ctrl+Alt+L 단축키를 화면 내부에 인라인으로 풀어쓴다.

## When to use / When NOT to use

- ✅ 단일 레코드(고객, 주문 헤더 등)의 CRUD 상세폼을 만들 때
- ✅ page / modal / control 뷰 중 **필요한 뷰만 선택적으로** 지원해야 할 때
- ✅ 편집·저장·삭제·복구·보조 기능·복합 상세(내부 시트)를 상황에 따라 누적해야 할 때
- ❌ CRUD 리스트(시트) 화면 → [`crud-list.md`](./crud-list.md)
- ❌ 페이지/모달 뷰 분기만 필요한 단순 컨테이너(라이프사이클 없음) → [`page-modal-container.md`](./page-modal-container.md)
- ❌ 다른 화면에서 데이터를 고르는 선택 버튼 → [`data-select-button.md`](./data-select-button.md)

## 전제조건

- `provideSdAngular({ clientName })` 부트스트랩 완료
- 앱별 ORM provider (예: `AppOrmProvider`) — `@simplysm/angular`가 아니라 각 앱이 소유
- 권한 제어가 있는 경우 `SdAppStructureProvider` 등록 (`injectPermsSignal` 전제)

## 기본 레시피 (page 뷰, 읽기 전용)

라우트 진입 시 `itemId`를 받아 단일 레코드를 로드하고 읽기 전용 필드로 표시하는 최소 완성 컴포넌트다. 편집·삭제·modal·control·보조·복합이 필요하면 [변형](#변형-확장-a-f-인덱스)의 확장을 선택적으로 얹는다.

```typescript
import { NgIcon } from "@ng-icons/core";
import { tablerRefresh } from "@ng-icons/tabler-icons";
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
// 앱별 대체: ORM provider + DbContext. @simplysm/angular가 아니라 각 앱이 소유한다.
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
  protected readonly tablerRefresh = tablerRefresh;
}
```

### 조건부 요소 포함 기준

인프라·라이프사이클 요소는 화면 요건에 따라 포함·생략한다. 필요 없는 요소를 기계적으로 포함하지 않는다.

| 요소 | 포함 조건 | 생략 예시 |
|------|----------|----------|
| `<sd-topbar-container>` + `<sd-topbar>` | routes로 연결된 page에서 헤더가 필요할 때. 기본 레시피는 page 전용이라 조건 없이 렌더 | route 미연결(control·래퍼) |
| `injectViewTitleSignal()` | topbar에 타이틀을 표시할 때 | topbar 없음·타이틀 불필요 |
| `injectViewTypeSignal()` + 분기 | page 외에 modal/control로도 겸용될 때. 기본 레시피는 page 전용이므로 **미포함** — [확장 C](./crud-detail/extension-c-modal-view.md) / [확장 D](./crud-detail/extension-d-control-view.md)에서 도입 | page 전용 |
| `injectPermsSignal()` + effect 내 권한 체크 | 권한 제어가 있는 화면. effect에서 `perms().includes("use")` 검사 후 미보유 시 `return` | 권한 제어 없음 |
| `<sd-busy-container>` + `busyCount` | 비동기 작업(DB 조회 등)이 있어 busy 표시가 필요할 때 | 동기 래퍼·레이아웃 |
| `initialized` + `@if (initialized())` | 초기 로딩 완료 전 깜박임 방지가 필요할 때 | 빈 상태 렌더가 무방 |

## 변형 (확장 A~F 인덱스)

| 상황 | 시작 지점 + 필요한 확장 |
|---|---|
| 단일 레코드 **읽기 전용 상세 폼** (page 뷰, 감사 필드 표시) | 기본 레시피만 |
| 편집·저장 가능한 단일 레코드 상세 폼 | 기본 + [확장 A](./crud-detail/extension-a-edit-save.md) |
| 삭제·복구 토글 포함 | 기본 + A + [확장 B](./crud-detail/extension-b-delete-restore.md) |
| page + **modal 뷰** 재사용 (확인·취소·삭제·복구 하단 바) | 기본 + A + B + [확장 C](./crud-detail/extension-c-modal-view.md) |
| 마스터-디테일의 "디테일" 영역 (**control 뷰**) | 기본 + A + B + [확장 D](./crud-detail/extension-d-control-view.md) |
| page + modal + control **3뷰** 모두 지원 | 기본 + A + B + C + D |
| 메인 폼과 별개의 **보조 기능** (가져오기/출력 등) | 기본 + A + [확장 E](./crud-detail/extension-e-auxiliary.md) |
| 상세 폼 내부에 **하위 컬렉션** 편집 (박스 목록 등) | 기본 + A + [확장 F](./crud-detail/extension-f-complex-detail.md) |

### 각 확장 요약

- **A. 편집/저장** (선행: 없음) — 읽기 전용을 편집 가능으로 전환. snapshot 기반 변경 감지, `setupCanDeactivate` 이탈 방지, Ctrl+S 일괄 저장. → [상세](./crud-detail/extension-a-edit-save.md)
- **B. 삭제/복구 토글** (선행: A) — soft-delete 전제. `isDeleted` 필드 + 삭제·복구 버튼. → [상세](./crud-detail/extension-b-delete-restore.md)
- **C. modal 뷰** (선행: A + B) — `SdModalContentDef` 계약, 하단 액션 바, 모달 우측 상단 액션 슬롯. → [상세](./crud-detail/extension-c-modal-view.md)
- **D. control 뷰** (선행: A + B) — 마스터-디테일 디테일 영역. 상단 `<sd-dock>` 도구 바. 확장 C와 병행 가능. → [상세](./crud-detail/extension-d-control-view.md)
- **E. 보조 기능 영역** (선행: A) — 메인 submit과 분리된 보조 `<sd-form>`. 권한 복사·출력 등. → [상세](./crud-detail/extension-e-auxiliary.md)
- **F. 복합 상세** (선행: A) — 내부 `<sd-sheet>` 중첩, `oneWayDiffs` 기반 일괄 저장. → [상세](./crud-detail/extension-f-complex-detail.md)

## 🚫 흔한 실수 (Anti-patterns)

> 공통 규칙(`mark` 오용, `injectViewTypeSignal()` 호출 위치, `_sdSharedData.wait()` 조건, 시트 셀 `[inset]`/`[size]`, soft-delete 선택 기준 등)은 [레시피 공통 규칙](./_common-rules.md)을 참조한다. 이 섹션은 **CRUD 상세폼 진입점 고유 실수**만 다룬다.

### 지원할 뷰를 확인하지 않고 3뷰 분기를 미리 박는다

```typescript
// ❌ 실제로는 page 뷰만 쓰는데 modal·control 분기를 선제 조립
// close output, viewType, <sd-dock [position]="'bottom'">, <ng-template #modalActionTpl>가
// 모두 죽은 코드로 남고, implements SdModalContentDef 경로는 호출되지 않는다.
@Component({ /* ... */ })
export class CustomerDetail implements SdModalContentDef<boolean | undefined> {
  close = output<boolean | undefined>();
  protected readonly viewType = injectViewTypeSignal();
  // ...
  template: `
    <sd-topbar-container>
      @if (viewType() === "page") { <sd-topbar>...</sd-topbar> }
      <sd-dock-container>
        @if (viewType() === "control" && canEdit()) { <sd-dock>...</sd-dock> }
        @if (viewType() === "modal" && canEdit()) {
          <sd-dock [position]="'bottom'">...</sd-dock>
        }
      </sd-dock-container>
    </sd-topbar-container>
    <ng-template #modalActionTpl>...</ng-template>
  `
}

// ✅ 기본 레시피는 page 전용으로 시작. 필요한 뷰가 생기면 확장을 얹는다
// modal 뷰가 필요해지는 시점에 확장 C를, control 뷰는 확장 D를 추가.
@Component({ /* ... */ })
export class CustomerDetail {
  itemId = input<number>();
  // page 전용 — viewType 분기·close output 없음
}
```

**근거**: 실제 호출되지 않는 뷰의 계약·분기·슬롯은 죽은 코드로 남아 LLM이 모달 사용처 탐색 시 오판 원인이 된다. 지원할 뷰를 먼저 확정하고 필요한 확장만 얹는다.

### `effect` 내부 비동기 호출을 `untracked`로 감싸지 않는다

```typescript
// ❌ _refresh() 내부에서 읽는 signal이 effect 의존성으로 등록 → 무한 루프
constructor() {
  effect(() => {
    this.itemId();
    void this._refresh(); // 내부의 this.data()·this.perms() 읽기가 그대로 의존성화
  });
}

// ✅ 비동기 작업은 untracked로 감싸 의존성 등록을 차단한다
constructor() {
  effect(() => {
    this.itemId(); // 여기서만 의존성 등록
    void untracked(async () => {
      await this._sdToast.try(() => this._refresh());
    });
  });
}
```

**근거**: Angular `effect`는 콜백 실행 중 읽힌 모든 signal을 의존성으로 등록한다. 비동기 함수 내부에서 signal을 읽으면 effect가 재실행되어 무한 루프가 발생한다.

### `setupCanDeactivate`를 `computed`·`effect`·일반 메서드에서 호출한다

```typescript
// ❌ NG0203 — inject()는 injection context에서만 호출 가능
protected readonly canEdit = computed(() => {
  setupCanDeactivate(() => !this._dirty()); // 런타임 에러
  return true;
});

// ✅ 생성자(또는 필드 이니셜라이저)에서만 호출
constructor() {
  setupCanDeactivate(() => !this._dirty());
}
```

**근거**: `setupCanDeactivate`는 내부에서 `inject(Router)` 등을 사용하므로 injection context가 필수다. computed/effect 콜백이나 일반 메서드 호출 시점엔 context가 없다.

## 관련 Entry

- [`crud-list.md`](./crud-list.md) — 시트 기반 CRUD 리스트. 차이: 단일 레코드 vs 컬렉션
- [`page-modal-container.md`](./page-modal-container.md) — page/modal 뷰 분기만 필요한 단순 컨테이너. 차이: CRUD 라이프사이클 없음
- [`data-select-button.md`](./data-select-button.md) — 데이터 선택 버튼. 차이: 모달 내부 선택 UI
- [`_common-rules.md`](./_common-rules.md) — 레시피 공통 규칙 (✅ Always / ⚠️ Ask first / 🚫 Never)
- [`SdModalContentDef`](../provider-types/sd-modal-content-def.md) — 확장 C(modal 뷰)에서 구현하는 계약
- [`SdModalProvider.showAsync`](../providers/sd-modal-provider.md) — 프로그래밍 방식 모달 호출
