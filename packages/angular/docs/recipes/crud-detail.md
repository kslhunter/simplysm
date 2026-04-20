# Recipe: CRUD 상세폼 화면 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` 표준 컴포넌트를 **직접 조립**하여 단일 레코드 CRUD 상세폼을 구성한다. 과거 `SdDataDetail` / `SdDataDetailBase`가 감추고 있던 load·save·delete 라이프사이클, `obj.equal` snapshot 기반 변경 감지, `setupCanDeactivate` 이탈 방지, busy 카운트, `SdToastProvider.try` 에러 래핑, Ctrl+S/Ctrl+Alt+L 단축키를 화면 내부에 인라인으로 풀어쓴다.

## 1. Overview

- 제거된 추상화: `SdDataDetail`(컴포넌트) / `SdDataDetailBase<T, R>`(추상 클래스) / `SdDataDetailDataInfo`(타입) / `#toolTpl`·`#prevTpl`·`#contentTpl`·`#nextTpl`·`#modalActionTpl` 슬롯 5종
- 대체: 소비 컴포넌트가 표준 조각을 직접 조립
- 조립 요소:
  - `<sd-busy-container [busy] [message]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 페이지 뷰 상단 헤더
  - `<sd-form #formCtrl (formSubmit)>` — Ctrl+S·submit 버튼 트리거
  - `injectViewTypeSignal()` — page / modal / control 뷰 판정
  - `injectPermsSignal()` — 권한 signal
  - `setupCanDeactivate()` — 이탈 방지
  - `SdToastProvider.try(fn, messageFn)` — 에러 래퍼 + busy 카운트
  - `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스 (소비 화면이 직접 `implements`)
  - `SdCommandDirective`(`sdRefreshCommand` / `sdSaveCommand`) — Ctrl+Alt+L / Ctrl+S 단축키
  - `getOrmDataEditToastErrorMessage(err)` — ORM 에러 → 사용자 메시지 변환
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
import { NgTemplateOutlet } from "@angular/common";
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
  getOrmDataEditToastErrorMessage,
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
  id: number | undefined;
  name: string;
  phone: string;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}

// 과거 `SdDataDetailDataInfo`에 해당 — 화면 내부에서 직접 선언한다.
interface IDataInfo {
  isNew: boolean;
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
    SdForm, SdButton, SdAnchor, SdTextfield,
    FormatPipe, NgIcon, NgTemplateOutlet,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSubmitButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0" [message]="busyMessage()">
      @if (initialized()) {
        @if (!canUse()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="icons.tablerAlertTriangle" [size]="'5em'" />
            <br /><br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (viewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>
              @if (canEdit()) {
                <sd-button [theme]="'link-primary'" (click)="onSubmitButtonClick()">
                  <ng-icon [svg]="icons.tablerDeviceFloppy" />
                  저장 <small>(CTRL+S)</small>
                </sd-button>
              }
              <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                <ng-icon [svg]="icons.tablerRefresh" />
                새로고침 <small>(CTRL+ALT+L)</small>
              </sd-button>
            </sd-topbar>
            <div class="fill">
              <ng-template [ngTemplateOutlet]="formTpl" />
            </div>
          </sd-topbar-container>
        } @else if (viewType() === "modal") {
          <div class="flex-column fill">
            <div class="flex-fill">
              <ng-template [ngTemplateOutlet]="formTpl" />
            </div>
            @if (canEdit()) {
              <div class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">
                @if (!dataInfo()?.isNew && canDelete()) {
                  @if (dataInfo()?.isDeleted) {
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
                  <sd-button [size]="'sm'" [theme]="'primary'" (click)="onSubmitButtonClick()">
                    확인
                  </sd-button>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- control 뷰: 다른 화면의 영역으로 삽입된 상태 -->
          <div class="flex-column fill">
            @if (canEdit()) {
              <div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
                <sd-button [theme]="'primary'" (click)="onSubmitButtonClick()">
                  <ng-icon [svg]="icons.tablerDeviceFloppy" />
                  저장 <small>(CTRL+S)</small>
                </sd-button>
                <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
                  <ng-icon [svg]="icons.tablerRefresh" />
                  새로고침 <small>(CTRL+ALT+L)</small>
                </sd-button>
                @if (!dataInfo()?.isNew && canDelete()) {
                  @if (dataInfo()?.isDeleted) {
                    <sd-button [theme]="'warning'" (click)="onRestoreButtonClick()">
                      <ng-icon [svg]="icons.tablerRestore" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
                      <ng-icon [svg]="icons.tablerEraser" />
                      삭제
                    </sd-button>
                  }
                }
              </div>
            }
            <div class="flex-fill">
              <ng-template [ngTemplateOutlet]="formTpl" />
            </div>
          </div>
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
        <ng-icon [svg]="icons.tablerRefresh" />
      </sd-anchor>
    </ng-template>

    <ng-template #formTpl>
      <div class="flex-column fill">
        <div class="flex-fill">
          <sd-form #formCtrl (formSubmit)="onSubmit()">
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
        </div>
        @if (dataInfo()?.lastModifiedAt || dataInfo()?.lastModifiedBy) {
          <div
            class="p-sm-default"
            [class.bg-theme-gray-lightest]="viewType() === 'modal'"
          >
            최종수정:
            @if (dataInfo()?.lastModifiedAt) {
              {{ dataInfo()!.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
            }
            @if (dataInfo()?.lastModifiedBy) {
              ({{ dataInfo()?.lastModifiedBy }})
            }
          </div>
        }
      </div>
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
  protected readonly busyMessage = signal<string | undefined>(undefined);
  protected readonly initialized = signal(false);
  protected readonly data = signal<ICustomer>({} as ICustomer);
  protected readonly dataInfo = signal<IDataInfo | undefined>(undefined);
  private _snapshot?: ICustomer;

  //== SdModalContentDef<boolean | undefined> 요구 필드 ==
  close = output<boolean | undefined>();
  // actionTplRef는 SdModal이 setter 프록시로 감싸므로 필드 선언만으로 충분
  actionTplRef?: TemplateRef<any>;

  //== viewChild ==
  protected readonly formCtrl = viewChild<SdForm>("formCtrl");
  private readonly _modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef });

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

  protected readonly icons = {
    tablerAlertTriangle, tablerDeviceFloppy, tablerEraser, tablerRefresh, tablerRestore,
  };

  //== 라이프사이클 ==
  constructor() {
    // 최초 진입 + itemId 변경 시 재조회.
    // effect의 자체 cleanup이 이중 실행을 방지하므로 queueMicrotask + cancelled 플래그는 불필요.
    effect(() => {
      this.itemId(); // 의존성 등록
      if (!this.canUse()) {
        this.initialized.set(true);
        return;
      }
      untracked(() => {
        void this._initRefresh();
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
    await this._refresh();
  }

  protected onSubmitButtonClick(): void {
    this.formCtrl()?.requestSubmit();
  }

  protected async onSubmit(): Promise<void> {
    if (this.busyCount() > 0) return;
    if (!this.canEdit()) return;
    const info = this.dataInfo();
    if (info == null) return;

    // isNew면 변경사항 체크 없이 저장. 기존 항목이면 snapshot 대비 변경사항 여부 판정.
    if (!info.isNew && this._snapshot != null && obj.equal(this.data(), this._snapshot)) {
      this._sdToast.info("변경사항이 없습니다.");
      return;
    }

    await this._sdToast.try(async () => {
      this.busyCount.update((v) => v + 1);
      try {
        const ok = await this._saveAsync(this.data());
        if (!ok) return;
        this._sdToast.success("저장되었습니다.");
        this.close.emit(true);
        await this._refresh();
      } finally {
        this.busyCount.update((v) => v - 1);
      }
    }, getOrmDataEditToastErrorMessage);
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

    await this._sdToast.try(async () => {
      this.busyCount.update((v) => v + 1);
      try {
        const ok = await this._deleteAsync(del);
        if (!ok) return;
        this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
        this.close.emit(true);
      } finally {
        this.busyCount.update((v) => v - 1);
      }
    }, getOrmDataEditToastErrorMessage);
  }

  private _checkIgnoreChanges(): boolean {
    return (
      this._snapshot == null ||
      obj.equal(this.data(), this._snapshot) ||
      confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?")
    );
  }

  private async _initRefresh(): Promise<void> {
    await this._refresh();
    this.initialized.set(true);
  }

  private async _refresh(): Promise<void> {
    await this._sdToast.try(async () => {
      this.busyCount.update((v) => v + 1);
      try {
        const r = await this._loadAsync();
        this.data.set(r.data);
        this.dataInfo.set(r.info);
        // isNew면 스냅샷 저장 생략 — 변경사항 체크를 항상 통과시켜 저장 허용
        this._snapshot = r.info.isNew ? undefined : obj.clone(r.data);
      } finally {
        this.busyCount.update((v) => v - 1);
      }
    }, getOrmDataEditToastErrorMessage);
  }

  //== 앱별 구현 ==
  private async _loadAsync(): Promise<{ data: ICustomer; info: IDataInfo }> {
    if (this.itemId() == null) {
      return {
        data: { id: undefined, name: "", phone: "", isDeleted: false,
                lastModifiedAt: undefined, lastModifiedBy: undefined },
        info: { isNew: true, isDeleted: false,
                lastModifiedAt: undefined, lastModifiedBy: undefined },
      };
    }
    // ORM 호출 예시:
    //   return this._appOrm.connectAsync(async (db) => {
    //     const data = (await db.customer
    //       .where((it) => [expr.eq(it.id, this.itemId())])
    //       .single())!;
    //     return {
    //       data,
    //       info: { isNew: false, isDeleted: data.isDeleted,
    //               lastModifiedAt: data.lastModifiedAt, lastModifiedBy: data.lastModifiedBy },
    //     };
    //   });
    throw new Error("구현 필요");
  }

  private async _saveAsync(_data: ICustomer): Promise<boolean> {
    // ORM upsert 후 true 반환. 검증 실패 시 undefined 반환하면 close/토스트 생략.
    throw new Error("구현 필요");
  }

  private async _deleteAsync(_del: boolean): Promise<boolean> {
    // if (del && !confirm("삭제하시겠습니까?")) return false;
    // ORM delete/restore 후 true 반환
    throw new Error("구현 필요");
  }
}
```

## 4. 분해 설명

각 블록의 역할과 원본 `SdDataDetail`/`SdDataDetailBase` 코드 대응 지점:

| 블록 | 역할 | 원본 대응 |
|---|---|---|
| `<sd-busy-container [busy] [message]>` | 전체 busy 오버레이 | `sd-data-detail.ts:53-54` + `SdBaseContainer` |
| `@if (initialized())` | 최초 조회 완료 전 본문 숨김 | `sd-data-detail.base.ts:92` `initialized.set(true)` |
| `@if (!canUse())` | 권한 없음 메시지 | `sd-base-container.ts:44-51` + `page-modal-container.md` |
| `@else if (viewType() === "page")` / `"modal"` / `@else` | 뷰 타입 분기 (`page-modal-container.md` 참조) | `sd-data-detail.ts:53, 56-58` `viewType` → `SdBaseContainer` 내부 분기 |
| `<sd-topbar-container>` + `<sd-topbar>` | 페이지 뷰 헤더 (저장/새로고침) | `sd-data-detail.ts:60-73` `#pageTopbarTpl` |
| modal 분기 하단 확인/삭제 바 | 모달 하단 액션 | `sd-data-detail.ts:151-175` `#modalBottomTpl` |
| control 분기 상단 바 (저장/새로고침/삭제) | 마스터-디테일의 디테일 도구 바 | `sd-data-detail.ts:77-109` |
| `<ng-template #modalActionTpl>` + `effect(() => actionTplRef = _modalActionTpl())` | 모달 우측 상단 새로고침 액션 (`SdModal`이 setter 프록시로 브릿지) | `sd-data-detail.ts:177-186, 201-207` `#modalActionTpl` + `parent.actionTplRef = ...` |
| `<sd-form #formCtrl (formSubmit)>` + 최종수정 표시 | 폼 본문 + `lastModifiedAt/By` | `sd-data-detail.ts:121-140` |
| `hostDirectives` + `SdCommandDirective` | Ctrl+Alt+L / Ctrl+S 단축키 | `sd-data-detail.ts:45-51` |
| `setupCanDeactivate(() => viewType() === "modal" || checkIgnoreChanges())` | 라우트 이탈 시 변경사항 확인 | `sd-data-detail.base.ts:99` |
| `_refresh()` 내 `busyCount.update + try/finally + sdToast.try` | busy 카운트 증감 + 에러 토스트 | `sd-data-detail.base.ts:86-91, 115-119` |
| `_snapshot = obj.clone(data)` + `obj.equal` 비교 | 변경 감지 | `sd-data-detail.base.ts:66, 127, 102-108, 162` |
| `effect(() => { itemId(); if (!canUse()) return; untracked(() => void this._initRefresh()); })` | 최초 로드 + input 변경 시 자동 reload | `sd-data-detail.base.ts:69-97` + `prepareRefreshEffect` 슬롯 |
| `close = output<R | undefined>()` + `implements SdModalContentDef<R>` | 모달 컨텐츠 계약 | `sd-data-detail.base.ts:29-30, 59` |

### 상태 분해

| signal / 필드 | 역할 |
|---|---|
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `busyMessage` | busy 오버레이 문구 |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `data` | 현재 편집 중인 데이터 (load 결과) |
| `dataInfo` | isNew/isDeleted/lastModifiedAt/lastModifiedBy 메타 정보 |
| `_snapshot` | 직전 `_refresh()` 시점의 data 깊은 복제본 (변경 감지용). `isNew`면 `undefined` |
| `close` | 모달 결과 output (`SdModalContentDef` 요구) |
| `actionTplRef` | 모달 우측 상단 액션 슬롯. `SdModal`이 setter 프록시로 자동 브릿지 |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onRefreshButtonClick()` | busy/권한/변경사항 가드 후 `_refresh()` |
| `onSubmitButtonClick()` | `formCtrl()?.requestSubmit()` — Ctrl+S와 동일 경로 |
| `onSubmit()` | `canEdit` 체크 + snapshot 대비 변경사항 여부 판정 + `_saveAsync(data)` + 성공 토스트 + `close.emit(true)` + `_refresh()` |
| `onDeleteButtonClick()` / `onRestoreButtonClick()` | `_toggleDelete(del)` 호출 |
| `_toggleDelete(del)` | busy/권한 가드 + `_deleteAsync(del)` + 토스트 + `close.emit(true)` |
| `_checkIgnoreChanges()` | snapshot 없거나 동일하면 true, 아니면 `confirm(...)` |
| `_initRefresh()` / `_refresh()` | `_loadAsync()` → `data.set` + `dataInfo.set` + snapshot 갱신 (isNew면 미저장) |
| `_loadAsync()` / `_saveAsync(data)` / `_deleteAsync(del)` | 앱별 ORM/API 구현 |

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

// 3) template — control 분기 또는 modal 분기 상단/하단에 보조 form 삽입.
//    아래는 control 뷰 분기 내부에 추가하는 예시 (위치: "저장/새로고침/삭제" 바 옆).
@if (viewType() === "control") {
  <div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <!-- 기본 저장/새로고침/삭제 버튼 -->
    <!-- ... -->

    <!-- 보조 기능: 다른 사용자로부터 가져오기 -->
    <sd-form (formSubmit)="onImportFormSubmit()">
      <div class="form-box-inline">
        <div>
          <label>가져오기</label>
          <sd-shared-data-select
            [items]="sharedUsers.items()"
            [(value)]="permCopySourceId"
            [inset]="true"
            [size]="'sm'"
          />
        </div>
        <div>
          <sd-button [type]="'submit'" [disabled]="permCopySourceId() == null">
            가져오기
          </sd-button>
        </div>
      </div>
    </sd-form>
  </div>
}

// 4) 메서드 추가
protected async onImportFormSubmit(): Promise<void> {
  if (this.busyCount() > 0 || !this.canEdit()) return;
  if (this.permCopySourceId() == null) return;
  if (!this._checkIgnoreChanges()) return;

  await this._sdToast.try(async () => {
    this.busyCount.update((v) => v + 1);
    try {
      // 서버 호출로 다른 사용자의 데이터를 조회
      //   const src = await this._api.fetchByIdAsync(this.permCopySourceId()!);
      //   this.data.set({ ...this.data(), ...src });
    } finally {
      this.busyCount.update((v) => v - 1);
    }
  }, getOrmDataEditToastErrorMessage);
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

// 3) template — formTpl 본문의 table 아래에 <sd-sheet> 중첩
<ng-template #formTpl>
  <div class="flex-column fill">
    <div class="flex-fill flex-column">
      <sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-column fill">
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
              <ng-icon [svg]="icons.tablerCirclePlus" />
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
                    <ng-icon [svg]="icons.tablerEraser" />
                  </div>
                </ng-template>
                <ng-template [cell]="data().boxes" let-item="item">
                  <div class="p-xs-sm tx-center">
                    <sd-anchor
                      [theme]="'danger'"
                      (click)="onToggleDeleteBoxButtonClick(item)"
                    >
                      <ng-icon [svg]="item.isDeleted ? icons.tablerRestore : icons.tablerEraser" />
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
    </div>
    <!-- 최종수정 표시는 그대로 -->
  </div>
</ng-template>

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

// 5) _saveAsync 내부에서 diff 계산 + 일괄 제출
private async _saveAsync(data: ICustomer): Promise<boolean> {
  // 삭제 플래그가 섞여 있으면 confirm
  if (data.boxes.some((b) => b.isDeleted)) {
    if (!confirm("삭제 표시된 박스가 있습니다. 정말 저장하시겠습니까?")) {
      return false;
    }
  }

  // 하위 컬렉션 diff 계산 — `type: "create" | "update" | "same"`
  const snapshotBoxes = this._snapshot?.boxes ?? [];
  const boxDiffs = data.boxes.oneWayDiffs(snapshotBoxes, "id");

  // ORM 호출 (앱별 구현):
  //   await this._appOrm.connectAsync(async (db) => {
  //     await db.customer.upsertAsync(data);
  //     for (const d of boxDiffs) {
  //       if (d.type === "create") await db.customerBox.insertAsync(d.target);
  //       else if (d.type === "update") await db.customerBox.updateAsync(d.target);
  //     }
  //   });

  return true;
}
```

**포인트:**

- 하위 컬렉션의 **삭제는 `isDeleted: true` 플래그로 표현**한다. `data().boxes`에서 row를 물리적으로 제거하면 `oneWayDiffs`가 해당 row를 감지하지 못한다 (`oneWayDiffs`는 `type: "create" | "update" | "same"`만 반환, **`"delete"` 없음**). 서버가 soft-delete 처리.
- 시트 셀 내부 컨트롤은 **`[inset]="true" [size]="'sm'"` 명시 필수** (§9 관용 규칙 1 참조).
- `data().boxes.push(newBox)` 같은 배열 mutation 후에는 `mark(this.data)`로 signal 참조를 갱신해야 OnPush 템플릿이 재렌더링된다(§9 관용 규칙 2 참조).
- `id`는 **클라이언트에서 UUID로 생성**하여 `trackByFn` + `oneWayDiffs`의 key로 사용. 서버가 발급한 PK가 별도로 있다면 별도 컬럼으로 관리하고 클라이언트 UUID는 row 식별자로만 사용.

## 7. 뷰 타입 분기

`@if (viewType() === "page") ... @else if (viewType() === "modal") ... @else { ... }` 분기 구조와 `modalOrPageTitle` computed 계산은 [`page-modal-container.md`](./page-modal-container.md)의 레시피와 동일하다. 본 레시피의 완성 예제도 그 패턴을 그대로 사용한다.

상세 폼 특화 사항:

- **모달 우측 상단 액션**: `SdModalProvider`는 모달 컨텐츠 컴포넌트 생성 시에만 setter 프록시를 설치한다(`sd-modal.provider.ts:141` `if ("actionTplRef" in contentRef.instance)`). 모달 뷰에서는 `this.actionTplRef = ...` 할당이 프록시를 통해 `SdModal.actionTplRef` input으로 자동 전달되어 헤더에 렌더된다. page/control 뷰에서는 프록시가 설치되지 않으므로 할당이 인스턴스 필드에만 저장되고 부작용이 없다(`<ng-template #modalActionTpl>` 선언 자체는 뷰 타입과 무관하게 `viewChild`로 `TemplateRef` 인스턴스를 반환하지만, 그 TemplateRef를 소비할 SdModal이 없으므로 결과적으로 아무 일도 일어나지 않는다).
- **모달 하단 확인/삭제 바**: 모달 뷰 분기 내부의 `<div class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">` 블록으로 직접 구성. `[size]="'sm'"`로 버튼 크기를 모달에 맞춤.
- **control 뷰 상단 바**: 페이지 뷰의 topbar가 없고 모달 뷰의 하단 바가 없는 대신, 상단에 `저장`/`새로고침`/`삭제` 버튼을 가로로 배치한 `<div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">` 블록을 사용.

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

- `effect(() => { this.itemId(); ... })` 안에서 비동기 `_refresh()`를 호출할 때 반드시 `untracked(() => void this._initRefresh())`로 감싼다. 그렇지 않으면 `_refresh` 내부의 signal 읽기가 effect 의존성으로 등록되어 무한 루프가 발생한다.

### `setupCanDeactivate`는 생성자에서만

- `setupCanDeactivate`는 `inject()`를 사용하므로 **생성자(또는 필드 이니셜라이저)**에서만 호출해야 한다. `computed`/`effect` 콜백 또는 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다.

### `injectViewTypeSignal()` 호출 시점

- 동일하게 `injectViewTypeSignal()`도 생성자 또는 필드 이니셜라이저에서만 호출한다.

### snapshot은 `obj.clone`로 깊은 복제

- `this._snapshot = this.data()` 같은 얕은 참조 대입은 `data().field = "x"` mutation을 snapshot까지 오염시켜 변경 감지가 실패한다. 반드시 `obj.clone(data)`로 깊은 복제.

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
- `getOrmDataEditToastErrorMessage` — 저장 에러 메시지 변환. `SdToastProvider.try(fn, getOrmDataEditToastErrorMessage)` 패턴으로 사용.
