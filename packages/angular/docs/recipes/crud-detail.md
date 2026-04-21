# Recipe: CRUD 상세폼 화면 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` 표준 컴포넌트를 **직접 조립**하여 단일 레코드 CRUD 상세폼을 구성한다. 과거 `SdDataDetail` / `SdDataDetailBase`가 감추고 있던 load·save·delete 라이프사이클, `obj.equal` snapshot 기반 변경 감지, `setupCanDeactivate` 이탈 방지, busy 카운트, `SdToastProvider.try` 에러 래핑, Ctrl+S/Ctrl+Alt+L 단축키를 화면 내부에 인라인으로 풀어쓴다.

## 1. Overview

- 제거된 추상화: `SdDataDetail`(컴포넌트) / `SdDataDetailBase<T, R>`(추상 클래스) / `SdDataDetailDataInfo`(타입) / `#toolTpl`·`#prevTpl`·`#contentTpl`·`#nextTpl`·`#modalActionTpl` 슬롯 5종
- 대체: 소비 컴포넌트가 표준 조각을 직접 조립
- 조립 요소:
  - `<sd-busy-container [busy]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 공통 컨테이너, `<sd-topbar>`는 page 뷰에서만 조건부 렌더
  - `<sd-dock-container>` + `<sd-dock>` — 뷰별 도구 바(control 상단 바 / modal 하단 바) 부착, 본문은 main 영역
  - `<sd-form #formCtrl (formSubmit)>` — Ctrl+S·submit 버튼 트리거
  - `injectViewTypeSignal()` — page / modal / control 뷰 판정
  - `injectPermsSignal()` — 권한 signal
  - `setupCanDeactivate()` — 이탈 방지
  - `SdToastProvider.try(fn)` — 에러 래퍼 (busy 카운트는 호출부에서 `busyCount.update`로 직접 제어)
  - `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스 (소비 화면이 직접 `implements`)
  - `SdCommandDirective`(`sdRefreshCommand` / `sdSaveCommand`) — Ctrl+Alt+L / Ctrl+S 단축키
- 데이터 비교:
  - `obj.clone(data)` — snapshot 복제 (`@simplysm/core-common`)
  - `obj.equal(a, b)` — deep equal

## 2. 언제 사용하는가

| 상황 | 적용 여부 |
|---|---|
| 단일 레코드 상세 폼 (로딩/저장/삭제/복구) | 본 레시피 전체 적용 |
| 페이지 뷰와 모달 뷰 모두에서 재사용 | 3뷰 분기 구조(§3) 그대로 사용 |
| 마스터-디테일의 "디테일" 영역 | control 뷰 분기 활용 |
| 메인 폼과 별개의 "가져오기/출력" 보조 기능 필요 | 레시피 + [변형 1: 보조 기능 영역](#5-변형-보조-기능-영역) |
| 상세 폼 내부에 하위 컬렉션(박스 목록 등) 편집 | 레시피 + [변형 2: 복합 상세 (내부 `<sd-sheet>`)](#6-변형-복합-상세-내부-sd-sheet) |
| CRUD 리스트(시트) 화면 | 본 레시피 대신 [`crud-list.md`](./crud-list.md) 사용 |
| 페이지/모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 완성 예제

아래는 **page·modal·control 3뷰를 모두 커버하는** 완성 컴포넌트다. 모달로 띄우면 `viewType() === "modal"`로 자동 판정되어 하단 "확인/삭제" 바와 우측 상단 "새로고침" 액션이 표시되고, 라우트로 진입하면 `"page"`로 판정되어 topbar에 저장/새로고침 버튼이 표시된다. 마스터-디테일의 디테일로 `<app-customer-detail class="flex-fill">`처럼 삽입하면 `"control"`로 판정되어 상단 바에 저장/새로고침/삭제 버튼이 표시된다.

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
        @if (!canUse()) {
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
                <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                  <ng-icon [svg]="tablerRefresh" />
                  새로고침
                  <small>(CTRL+ALT+L)</small>
                </sd-button>
              </sd-topbar>
            }

            <sd-dock-container>
              <!-- control 뷰 상단 바: 저장/새로고침/삭제 -->
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
                  @if (!isNew() && canDelete()) {
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

              <!-- modal 뷰 하단 바: 삭제/복구 + 확인 -->
              @if (viewType() === "modal" && canEdit()) {
                <sd-dock
                  [position]="'bottom'"
                  class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest"
                >
                  @if (!isNew() && canDelete()) {
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
  protected readonly viewType = injectViewTypeSignal();
  protected readonly canUse = injectPermsSignal(
    () => ["sales.customer"],
    () => ["use"],
  );
  protected readonly canEdit = injectPermsSignal(
    () => ["sales.customer"],
    () => ["edit"],
  );
  // canDelete를 canEdit와 분리해서 제한하고 싶으면 별도 권한 signal로 교체
  protected readonly canDelete = computed(() => this.canEdit());

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
      if (!this.canUse()) {
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
    if (!this.canUse()) return;
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
    if (!this.canEdit()) return;

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
    if (!this.canEdit()) return;
    if (!this.canDelete()) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      // 앱별 ORM delete/restore — 예:
      //   if (del && !confirm("삭제하시겠습니까?")) return;
      //   await this._appOrm.connectAsync(async (db) => {
      //     await db.customer.where(...).update({ isDeleted: del });
      //   });

      this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
      this.close.emit(true);
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

## 4. 분해 설명

각 블록의 역할과 원본 `SdDataDetail`/`SdDataDetailBase` 코드 대응 지점:

| 블록 | 역할 | 원본 대응 |
|---|---|---|
| `<sd-busy-container [busy]>` | 전체 busy 오버레이 | `sd-data-detail.ts:53-54` + `SdBaseContainer` |
| `@if (initialized())` | 최초 조회 완료 전 본문 숨김 | `sd-data-detail.base.ts:92` `initialized.set(true)` |
| `@if (!canUse())` | 권한 없음 메시지 | `sd-base-container.ts:44-51` + `page-modal-container.md` |
| `<sd-topbar-container>` 공통 껍데기 + `@if (viewType() === "page")` 내부에 `<sd-topbar>` | 페이지 뷰만 topbar 표시, 나머지 뷰는 topbar 없는 컨테이너로 사용 | `sd-data-detail.ts:53-109` `viewType` → `SdBaseContainer` 내부 분기 |
| `<sd-dock-container>` + `<sd-dock>` 순서대로 control 상단 바 / modal 하단 바(`[position]="'bottom'"`) / main(form) | 뷰별 도구 바는 `<sd-dock>`으로 부착, 본문은 main 영역에 그대로 | `sd-data-detail.ts:77-175` `#modalBottomTpl` / control 상단 바 |
| `<ng-template #modalActionTpl>` + `effect(() => actionTplRef = _modalActionTpl())` | 모달 우측 상단 새로고침 액션 (`SdModal`이 setter 프록시로 브릿지) | `sd-data-detail.ts:177-186, 201-207` `#modalActionTpl` + `parent.actionTplRef = ...` |
| `<sd-form #formCtrl (formSubmit)>` + 최종수정 표시 | main 영역의 폼 본문 + `lastModifiedAt/By` | `sd-data-detail.ts:121-140` |
| `hostDirectives` + `SdCommandDirective` | Ctrl+Alt+L / Ctrl+S 단축키 | `sd-data-detail.ts:45-51` |
| `setupCanDeactivate(() => viewType() === "modal" || checkIgnoreChanges())` | 라우트 이탈 시 변경사항 확인 | `sd-data-detail.base.ts:99` |
| 호출부(`onRefresh`/`onSubmit`/`_toggleDelete`/초기 effect) 내 `busyCount.update` + `sdToast.try(...)` | busy 카운트 증감 + 에러 토스트 래핑 | `sd-data-detail.base.ts:86-91, 115-119` |
| `_snapshot = obj.clone(data)` + `obj.equal` 비교 | 변경 감지 | `sd-data-detail.base.ts:66, 127, 102-108, 162` |
| `effect(() => { itemId(); if (!canUse()) return; untracked(async () => { busy/try + _refresh() + initialized.set(true) }); })` | 최초 로드 + `itemId` 변경 시 자동 reload | `sd-data-detail.base.ts:69-97` + `prepareRefreshEffect` 슬롯 |
| `close = output<R | undefined>()` + `implements SdModalContentDef<R>` | 모달 컨텐츠 계약 | `sd-data-detail.base.ts:29-30, 59` |

### 상태 분해

| signal / 필드 | 역할 |
|---|---|
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `data` | 현재 편집 중인 데이터 (load 결과). `isDeleted`·`lastModifiedAt`·`lastModifiedBy` 포함 |
| `isNew` | `computed(() => data().id == null)` — 신규 레코드 여부 (저장·삭제 분기) |
| `_snapshot` | 직전 `_refresh()` 시점의 data 깊은 복제본 (변경 감지용). 신규(`id == null`)면 `undefined` |
| `close` | 모달 결과 output (`SdModalContentDef` 요구) |
| `actionTplRef` | 모달 우측 상단 액션 슬롯. `SdModal`이 setter 프록시로 자동 브릿지 |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onRefreshButtonClick()` | busy/권한/변경사항 가드 → `busyCount` 증가 → `_sdToast.try(_refresh)` → `busyCount` 감소 |
| `onSaveButtonClick()` | `formCtrl()?.requestSubmit()` — Ctrl+S와 동일 경로. `host`의 `sdSaveCommand`와 어휘 일치 |
| `onSubmit()` | `canEdit` 체크 → `isNew()`가 아니면 snapshot 대비 변경사항 판정 → `busyCount` 증가 → `_sdToast.try(ORM upsert + close.emit + _refresh)` → `busyCount` 감소. 실제 upsert 호출은 `_sdToast.try` 내부에 인라인 (단일 호출처이므로 별도 메서드로 분리하지 않음) |
| `onDeleteButtonClick()` / `onRestoreButtonClick()` | `_toggleDelete(del)` 호출 |
| `_toggleDelete(del)` | busy/권한 가드 → `busyCount` 증가 → `_sdToast.try(ORM delete/restore + close.emit)` → `busyCount` 감소. delete/restore는 인라인 |
| `_checkIgnoreChanges()` | snapshot 없거나 동일하면 true, 아니면 `confirm(...)` |
| `_refresh()` | `itemId() == null`이면 빈 객체, 아니면 앱별 ORM 조회 → `data.set` + snapshot 갱신 (`data().id == null`이면 미저장). busy/try는 호출부 책임. 조회 로직은 호출처가 한 곳뿐이므로 `_refresh` 내부에 인라인 |

## 5. 변형: 보조 기능 영역

메인 폼의 submit과 별개인 보조 기능(예: 다른 사용자로부터 권한 복사, 출력 등)은 control 뷰 상단 바 또는 모달 하단 바 옆에 별도의 `<sd-form>`으로 배치한다. 과거 `#toolTpl` 슬롯이 담당하던 역할을 소비 화면에 직접 인라인한다.

`CustomerDetail`을 기준으로 아래 변경을 적용한다.

```typescript
// 1) imports 추가
import { SdSharedDataSelect } from "@simplysm/angular";
// ... (앱 공용 useSharedSignal 등)

// 2) 클래스에 필드 추가
protected readonly permCopySourceId = signal<number | undefined>(undefined);
protected readonly sharedUsers = useSharedSignal("사용자");  // 앱 공용 provider

// 3) template — control 뷰의 <sd-dock>(상단 바) 내부, 또는 modal 뷰의 <sd-dock [position]="'bottom'">(하단 바) 옆에
//    보조 form을 인라인한다. 아래는 control 뷰 분기 안에서 저장/새로고침/삭제 버튼과 같은 <sd-dock> 안에 추가하는 예시.
@if (viewType() === "control" && canEdit()) {
  <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <!-- 기본 저장/새로고침/삭제 버튼 -->
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
  if (this.busyCount() > 0 || !this.canEdit()) return;
  if (this.permCopySourceId() == null) return;
  if (!this._checkIgnoreChanges()) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 서버 호출로 다른 사용자의 데이터를 조회
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

## 6. 변형: 복합 상세 (내부 `<sd-sheet>`)

상세 폼 안에 하위 컬렉션(박스 목록, 품목 라인 등)을 편집할 때 `<sd-form>` 본문 내부에 `<sd-sheet>`를 중첩한다. 하위 컬렉션의 행 추가·수정·삭제는 `item.isDeleted = true` 플래그로 soft-delete하여 `ArrayOneWayDiffResult` 기반 일괄 저장에 포함시킨다.

```typescript
// 1) imports 추가
import { SdSheet, SdSheetColumn, SdSheetColumnCellTemplate } from "@simplysm/angular";
import { mark, Uuid } from "@simplysm/core-common";
import { tablerCirclePlus } from "@ng-icons/tabler-icons";
import "@simplysm/core-common";  // Array.prototype.oneWayDiffs 프로토타입 확장

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
//    하위 컬렉션 도구·시트 중첩. §3 기본 예제의 main 영역을 다음 구조로 교체:
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
  <!-- 최종수정 표시는 §3 기본 예제와 동일 -->
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
  this.close.emit(true);

  await this._refresh();
});
```

**포인트:**

- 하위 컬렉션의 **삭제는 `isDeleted: true` 플래그로 표현**한다. `data().boxes`에서 row를 물리적으로 제거하면 `oneWayDiffs`가 해당 row를 감지하지 못한다 (`oneWayDiffs`는 `type: "create" | "update" | "same"`만 반환, **`"delete"` 없음**). 서버가 soft-delete 처리.
- 시트 셀 내부 컨트롤은 **`[inset]="true" [size]="'sm'"` 명시 필수** (§9 관용 규칙 1 참조).
- `data().boxes.push(newBox)` 같은 배열 mutation 후에는 `mark(this.data)`로 signal 참조를 갱신해야 OnPush 템플릿이 재렌더링된다(§9 관용 규칙 2 참조).
- `id`는 **클라이언트에서 UUID로 생성**하여 `trackByFn` + `oneWayDiffs`의 key로 사용. 서버가 발급한 PK가 별도로 있다면 별도 컬럼으로 관리하고 클라이언트 UUID는 row 식별자로만 사용.

## 7. 뷰 타입 분기

세 뷰(page / modal / control)는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 페이지·모달·컨트롤별로 별도 블록을 전체 복제하지 않는다.

| 뷰 | topbar | dock (도구 바) | main (form) |
|---|---|---|---|
| page | `<sd-topbar>` (저장/새로고침) | 없음 | form + 최종수정 |
| modal | 없음 | `<sd-dock [position]="'bottom'">` (삭제/복구 + 확인) | 동일 |
| control | 없음 | `<sd-dock>` 상단 (저장/새로고침/삭제) | 동일 |

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

상세 폼 특화 사항:

- **모달 우측 상단 액션**: `SdModalProvider`는 모달 컨텐츠 컴포넌트 생성 시에만 setter 프록시를 설치한다(`sd-modal.provider.ts:141` `if ("actionTplRef" in contentRef.instance)`). 모달 뷰에서는 `this.actionTplRef = ...` 할당이 프록시를 통해 `SdModal.actionTplRef` input으로 자동 전달되어 헤더에 렌더된다. page/control 뷰에서는 프록시가 설치되지 않으므로 할당이 인스턴스 필드에만 저장되고 부작용이 없다(`<ng-template #modalActionTpl>` 선언 자체는 뷰 타입과 무관하게 `viewChild`로 `TemplateRef` 인스턴스를 반환하지만, 그 TemplateRef를 소비할 SdModal이 없으므로 결과적으로 아무 일도 일어나지 않는다).
- **`<sd-dock>` position 명시**: control 뷰 상단 바는 `position` 생략(기본 `"top"`). **modal 하단 바는 반드시 `[position]="'bottom'"`를 명시**한다 — 기본값이 top이라 누락하면 상단에 쌓여 필터/도구와 겹친다(`packages/angular/src/layout/dock/sd-dock.ts:97`).
- **modal 하단 확인/삭제 바**: `<sd-dock [position]="'bottom'" class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">` 블록으로 구성. 버튼은 `[size]="'sm'"`로 모달에 맞춤.
- **control 뷰 상단 바**: page 뷰의 topbar가 없고 modal 뷰의 하단 바가 없는 대신, `<sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">` 상단 dock에 `저장`/`새로고침`/`삭제` 버튼을 가로로 배치.

## 8. 주의사항 (자주 하는 실수)

### 공통 유틸 재도입 금지

- `useDataDetail()`, `useCrudDetail()`, `setupDataDetail()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다.

### `_sdSharedData.wait()` 선택적 호출

- 과거 `SdDataDetailBase`는 `_refresh()` 직전에 `await this._sdSharedData.wait()`를 호출했다. **공유 데이터를 화면에서 실제로 사용하지 않는다면 이 호출은 불필요**. 사용한다면 `_refresh()` 맨 앞에 `await inject(SdSharedDataProvider).wait();`를 삽입한다.

### 커스텀 close 결과 (`R` 제네릭)

- 모달이 boolean 대신 사용자 정의 결과를 돌려주어야 할 때, `close = output<FooResult | undefined>()` + `implements SdModalContentDef<FooResult | undefined>`로 선언한다. 호출 측은 `const result: FooResult | undefined = await sdModal.showAsync({ type: CustomerDetail, ... })`로 받는다.

### 조용한 저장 (`hideNoChangeMessage` 대응)

- 과거 `doSubmit({ hideNoChangeMessage: true })`는 "변경사항이 없습니다" info 토스트를 억제했다. 레시피에서는 `onSubmit()`의 `this._sdToast.info("변경사항이 없습니다.")` 호출부를 **조건으로 감싸** 직접 제어한다. 예: `if (!silent) this._sdToast.info("변경사항이 없습니다.");`. 프로그래밍 저장 메서드(`onPrintButtonClick` 등)는 `silent=true`로 호출.

### `effect` 내부 `untracked`

- `effect(() => { this.itemId(); ... })` 안에서 비동기 `_refresh()`를 호출할 때 반드시 `void untracked(async () => { ... await this._refresh(); ... })`로 감싼다. 그렇지 않으면 `_refresh` 내부의 signal 읽기(인라인된 ORM 조회 포함)가 effect 의존성으로 등록되어 무한 루프가 발생한다.

### `setupCanDeactivate`는 생성자에서만

- `setupCanDeactivate`는 `inject()`를 사용하므로 **생성자(또는 필드 이니셜라이저)**에서만 호출해야 한다. `computed`/`effect` 콜백 또는 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다.

### `injectViewTypeSignal()` 호출 시점

- 동일하게 `injectViewTypeSignal()`도 생성자 또는 필드 이니셜라이저에서만 호출한다.

### snapshot은 `obj.clone`로 깊은 복제

- `this._snapshot = this.data()` 같은 얕은 참조 대입은 `data().field = "x"` mutation을 snapshot까지 오염시켜 변경 감지가 실패한다. 반드시 `obj.clone(data)`로 깊은 복제.

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

### `isNew`는 `data().id == null` 기반 computed — PK 형태에 따라 대안 필요

- 이 레시피는 `isNew = computed(() => data().id == null)`로 신규 여부를 파생한다. `_refresh()` 내부의 `itemId() == null` 분기가 `id: undefined`로 초기화하므로 자동으로 `true`가 된다.
- **PK가 자동증가 숫자가 아닌 경우 이 판정이 깨진다.** 예컨대 클라이언트에서 UUID를 미리 생성해 `id`에 채워 넣는 스키마, 자연키(복합키 포함) 스키마에서는 신규 상태에도 `id`가 존재한다.
  - 대안: `isNew`를 `signal<boolean>(false)`로 유지하고 `_refresh()` 내부에서 신규 여부를 별도로 세팅한다. 이때 snapshot 분기(`data.id == null ? undefined : obj.clone(data)`)도 `this.isNew() ? undefined : obj.clone(data)`로 바꿔야 한다.

## 9. 레시피 작성 관용 규칙

향후 데이터 관련 레시피(CRUD 리스트·상세·선택 버튼 등) 전반에서 아래 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다.
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략.
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다.

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

- `mark(sig)`는 `WritableSignal`의 값을 shallow copy하여 **참조를 갱신**한다 (배열: `[...v]`, 객체: `{...v}`).
- 역할: **OnPush 템플릿 재렌더링** + **다른 computed / effect의 의존성 갱신**.
- **"저장 감지"가 아니다.** `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)이 deep equal로 snapshot과 값 차이를 감지하므로, `data().field = value` 같은 mutation은 `mark` 없이도 `_checkIgnoreChanges()` / `onSubmit()`의 snapshot 비교에서 감지된다.
- Chrome 61 호환성(Proxy 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 호출이 필요.
- ❌ "mark 없으면 저장이 안 된다" 식 서술 금지.

### 규칙 3: `setupCanDeactivate`는 뷰 타입에 따라 분기

- 모달 뷰에서는 `SdActivatedModalProvider.canDeactivateFn`에 등록되고, 페이지 뷰에서는 라우트 guard로 등록된다. control 뷰에서는 아무 동작 하지 않는다 (`sd-data-detail.base.ts:99` + `setupCanDeactivate.ts:5`).
- 레시피는 항상 `setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges())` 형태로 호출한다. 모달에서는 `true`를 돌려 항상 이탈 허용하고(모달 자체 취소 버튼으로 제어), 페이지에서는 `_checkIgnoreChanges()`의 confirm 결과로 제어.

---

## Cross-reference

- CRUD 리스트(시트) 화면 — `<sd-sheet>` 직접 조립 레시피. → [`crud-list.md`](./crud-list.md)
- 페이지/모달 컨테이너 분기 — → [`page-modal-container.md`](./page-modal-container.md)
- `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스. → [`../provider-types.md`](../provider-types.md)
- `SdModalProvider.showAsync()` — 프로그래밍 방식 모달 호출. → [`../providers.md`](../providers.md)
