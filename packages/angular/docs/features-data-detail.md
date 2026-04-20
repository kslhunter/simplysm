# Feature: SdDataDetail

상세 폼 CRUD 추상화. 단일 레코드의 로딩/저장/삭제/변경감지/단축키를 제공한다. 페이지·모달·컨트롤 뷰 모두 지원.

- `SdDataDetailBase`: `packages/angular/src/data/data-detail/sd-data-detail.base.ts`
- `SdDataDetail`: `packages/angular/src/data/data-detail/sd-data-detail.ts`

## 1. Overview

`SdDataDetailBase<TData, TResult = boolean>`를 상속하여 구현 클래스를 만들고, 템플릿 루트에 `<sd-data-detail>`을 배치한다. `<sd-data-detail>`은 `injectParent<SdDataDetailBase<any>>()`로 부모 상속자를 자동 감지하여 렌더링한다.

`SdDataDetailBase`는 `SdModalContentDef<TResult>`를 구현하므로 `SdModalProvider.showAsync()`로 모달로 띄울 수 있다.

## 2. 언제 사용하는가

| 상황 | 권장 |
|---|---|
| 단일 레코드 로딩/저장/삭제 폼 (모달 상세) | **SdDataDetail** |
| 페이지 일부로 상세 폼이 들어갈 때 (마스터-디테일의 디테일) | **SdDataDetail** (control 뷰 자동 감지) |
| 복잡한 하위 컬렉션을 포함한 폼 (박스 목록 등) | **SdDataDetail** + 내부 `<sd-sheet>` |
| 단순 필드 편집이 아닌 커스텀 워크플로(다단계 다이얼로그 등) | `SdBaseContainer` 직접 사용 |
| 자유형 모달 (버튼 배치 직접 제어) | `SdModalContentDef` 직접 구현 |

실무 대비:
- `UserPermissionDetail.ts:84` — 페이지 디테일 영역 (view type: control)
- `InboundInstructionDetail.ts:525` — 마스터-디테일의 디테일 (내부 `<sd-sheet>` 조합)
- `OutsourcingMaterialOutboundDetail` (v12) — 단독 모달 상세

## 3. 기본 사용 패턴

```typescript
@Component({
  selector: "app-foo-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataDetail, SdTextfield],
  template: `
    <sd-data-detail>
      <ng-template #contentTpl>
        <div class="fill p-default">
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
                    (valueChange)="mark(data)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-template>
    </sd-data-detail>
  `,
})
export class FooDetail extends SdDataDetailBase<IData> {
  private readonly _appOrm = inject(AppOrmProvider);

  itemId = input<number>();

  override canUse = computed(() => true);
  override canEdit = computed(() => true);

  override prepareRefreshEffect() {
    this.itemId();  // itemId 변경 시 자동 refresh
  }

  override async load() {
    if (this.itemId() == null) {
      return {
        data: { name: "" } as IData,
        info: {
          isNew: true,
          isDeleted: false,
          lastModifiedAt: undefined,
          lastModifiedBy: undefined,
        },
      };
    }

    return this._appOrm.connectAsync(async (db) => {
      const data = (await db.foo()
        .where((item) => [expr.eq(item.id, this.itemId())])
        .single())!;
      return {
        data,
        info: {
          isNew: false,
          isDeleted: data.isDeleted,
          lastModifiedAt: data.lastModifiedAt,
          lastModifiedBy: data.lastModifiedBy,
        },
      };
    });
  }

  override async submit(data: IData): Promise<boolean> {
    await this._appOrm.connectAsync(async (db) => {
      // upsert 로직
    });
    return true;
  }

  override async toggleDelete(del: boolean): Promise<boolean | undefined> {
    if (del && !confirm("삭제하시겠습니까?")) return undefined;
    await this._appOrm.connectAsync(async (db) => {
      // delete/restore 로직
    });
    return true;
  }

  protected readonly mark = mark;
}

interface IData {
  id?: number;
  name: string;
  isDeleted?: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

## 4. 추상 API (Base 클래스)

### 4.1 클래스 시그니처

```typescript
@Directive()
abstract class SdDataDetailBase<
  T extends object,      // 데이터 타입
  R = boolean,           // 모달 close 결과 타입 (기본 boolean)
> implements SdModalContentDef<R>
```

### 4.2 필수 override (abstract 멤버)

| 멤버 | 타입 | 역할 |
|---|---|---|
| `canUse` | `Signal<boolean>` | 조회/사용 권한. `false`면 `<sd-base-container>`가 "권한 없음" 메시지 표시 |
| `canEdit` | `Signal<boolean>` | 편집 권한. `false`면 저장/삭제/편집 UI 숨김 |
| `load()` | `async () => { data: T; info: SdDataDetailDataInfo }` | 데이터 + 메타 정보 반환. **신규 모드**면 `isNew: true`와 초기 `data` 반환 |

### 4.3 선택 override (optional 멤버)

| 멤버 | 타입 | 역할 | 언제 |
|---|---|---|---|
| `canDelete` | `Signal<boolean>` | 삭제 권한 (편집 권한과 별개로 제한할 때) | 필요 시 |
| `prepareRefreshEffect()` | `() => void` | 새로고침 effect 의존성 등록점 | 외부 input이 바뀌면 자동 refresh 필요할 때 |
| `toggleDelete(del)` | `async (boolean) => R \| undefined` | 삭제/복구 처리. 성공 시 `R`(기본 `true`) 반환하면 `close.emit` | 삭제 기능 제공 시 |
| `submit(data)` | `async (data) => R \| undefined` | 저장 처리. 성공 시 `R`(기본 `true`) 반환하면 `close.emit` | 저장 기능 제공 시 |

> `toggleDelete`/`submit`가 **정의되어 있으면** 해당 기능 버튼이 자동 노출된다.

### 4.4 타입 정의

```typescript
interface SdDataDetailDataInfo {
  isNew: boolean;                       // 신규 모드 여부 (true면 "변경사항 없음" 체크 스킵)
  isDeleted: boolean;                   // 현재 삭제 상태 (true면 복구 버튼, false면 삭제 버튼)
  lastModifiedAt: DateTime | undefined; // 최종 수정일시 (화면 하단 표시)
  lastModifiedBy: string | undefined;   // 최종 수정자 (화면 하단 표시)
}
```

## 5. Base가 상속자에 노출하는 signal / 메서드

### 5.1 signal

| signal | 타입 | 설명 |
|---|---|---|
| `data` | `WritableSignal<T>` | 현재 데이터 (load 결과가 들어옴). 템플릿에서 `data()` 및 `data().field` 바인딩 |
| `dataInfo` | `WritableSignal<SdDataDetailDataInfo \| undefined>` | load 결과의 meta 정보 |
| `busyCount` | `WritableSignal<number>` | busy 카운터 (>0이면 busy 표시) |
| `busyMessage` | `WritableSignal<string \| undefined>` | busy 메시지 |
| `initialized` | `WritableSignal<boolean>` | 초기화 완료 여부 |
| `viewType` | `Signal<SdViewType>` | 현재 뷰 타입 (`"page" \| "modal" \| "control"`) |

### 5.2 메서드

| 메서드 | 시그니처 | 용도 |
|---|---|---|
| `doRefresh()` | `async () => void` | 새로고침 (Ctrl+Alt+L 기본 연결). 변경사항 있으면 confirm |
| `refresh()` | `async () => void` | 직접 refresh (load 재호출 + snapshot 갱신) |
| `doToggleDelete(del)` | `async (boolean) => void` | 삭제/복구 버튼 핸들러. 내부적으로 `toggleDelete(del)` 호출 + close emit |
| `doSubmit(opt?)` | `async (opt?) => void` | 저장 핸들러. 변경사항 검사 후 `submit(data)` 호출 + close emit + refresh. `opt.permCheck`·`opt.hideNoChangeMessage` |
| `checkIgnoreChanges()` | `() => boolean` | snapshot과 diff → 변경 없거나 사용자 confirm 시 true |

### 5.3 protected 필드 (상속자 내부 사용)

| 필드 | 타입 | 용도 |
|---|---|---|
| `_sdToast` | `SdToastProvider` | 커스텀 토스트 호출 (예: `this._sdToast.success("…")`) |
| `_sdSharedData` | `SdSharedDataProvider` | 공유 데이터 wait (내부에서 자동 호출, 명시적 재호출은 드묾) |
| `_errorHandler` | `ErrorHandler` | 글로벌 에러 핸들러 |

### 5.4 output

| output | 타입 | 설명 |
|---|---|---|
| `close` | `OutputEmitterRef<R>` | 모달 결과 emit. `submit`/`toggleDelete` 성공 시 자동 emit |

### 5.5 특수 속성

- `actionTplRef`: `<sd-data-detail>`이 세팅하는 모달 액션 템플릿 참조 (일반적으로 건드리지 않음)

## 6. SdDataDetail 컴포넌트 입력 / 템플릿 슬롯

### 6.1 `<sd-data-detail>` 입력

`<sd-data-detail>` 자체는 사용자용 입력이 없다. 모든 동작은 Base 상속자의 signal/메서드에서 결정된다.

### 6.2 Content Children (명명 템플릿)

`<sd-data-detail>` 안에 `<ng-template #슬롯명>` 형식으로 배치한다.

| 슬롯명 | 렌더링 위치 | 용도 |
|---|---|---|
| `#toolTpl` | control 뷰의 상단 저장/삭제 바 뒤 | 추가 도구 (가져오기 등) |
| `#prevTpl` | 폼 본문 위 | 상단 안내/요약 영역 |
| `#contentTpl` (required) | 폼 본문 (`<sd-form>` 내부) | **메인 폼 내용** |
| `#nextTpl` | 폼 본문 아래, 최종수정 정보 다음 | 하단 보조 영역 |

**주의**: `#contentTpl`은 내부적으로 `<sd-form>`으로 감싸진다. `Ctrl+S`와 submit 버튼이 이 form의 submit을 트리거한다.

## 7. 내장 버튼 / 단축키

### 7.1 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Ctrl+S` | `doSubmit({ permCheck: true })` | `canEdit()` + `submit` 정의 시 |
| `Ctrl+Alt+L` | `doRefresh()` | 항상 |

### 7.2 자동 렌더링 버튼

뷰 타입(`viewType()`)에 따라 버튼 위치가 다르다.

**Page 뷰 (탑바)**:
| 버튼 | 조건 |
|---|---|
| 저장 (`CTRL+S`) | `canEdit()` + `submit` 정의 |
| 새로고침 (`CTRL+ALT+L`) | 항상 |

**Control 뷰 (폼 상단 바)** — `canEdit()` 조건:
| 버튼 | 조건 |
|---|---|
| 저장 (`CTRL+S`) | `submit` 정의 |
| 새로고침 (`CTRL+ALT+L`) | `submit` 정의 (쌍으로 같이 표시) |
| 삭제 | `!dataInfo().isNew` + `toggleDelete` 정의 + (canDelete 없거나 `canDelete()` true) + `!dataInfo().isDeleted` |
| 복구 | 위 조건 + `dataInfo().isDeleted` |

**Modal 뷰 (모달 바닥 + 우측 액션)** — `canEdit()` 조건:
| 버튼 | 조건 |
|---|---|
| 확인 (모달 하단) | 항상 표시 → `doSubmit()` |
| 삭제 (모달 하단, 좌측) | `!dataInfo().isNew` + `toggleDelete` 정의 + (canDelete 없거나 true) + `!dataInfo().isDeleted` |
| 복구 (모달 하단, 좌측) | 위 조건 + `dataInfo().isDeleted` |
| 새로고침 (모달 상단 우측 액션) | 항상 (`CTRL+ALT+L`) |

### 7.3 자동 렌더링 영역

- **최종수정 정보**: `dataInfo().lastModifiedAt` 또는 `lastModifiedBy` 존재 시 폼 하단에 자동 표시 (`yyyy-MM-dd HH:mm (사용자)`)

## 8. 합성 패턴

### 8.1 마스터-디테일의 디테일 (control 뷰)

부모 페이지가 `<sd-base-container>`이고 그 안에 `<app-foo-detail class="flex-fill">`로 배치되는 경우, `SdDataDetail`이 자동으로 `viewType() === "control"`로 판단되어 상단 저장/삭제 바를 렌더링한다.

```typescript
// 부모 페이지
template: `
  <sd-base-container>
    <ng-template #contentTpl>
      <div class="flex-row fill">
        <app-foo-sheet #headerSheet selectMode="single" class="flex-min" />
        @let _selectedId = headerSheet.selectedItems().first()?.id;
        @if (_selectedId != null) {
          <app-foo-detail
            class="flex-fill"
            [fooId]="_selectedId"
            (close)="headerSheet.doRefresh()"
          />
        }
      </div>
    </ng-template>
  </sd-base-container>
`
```

### 8.2 모달로 띄우기

```typescript
const result = await this._sdModal.showAsync({
  type: FooDetail,
  title: "Foo 상세",
  inputs: { fooId: 123 },
});
if (result) { /* 성공 */ }
```

자동으로 `viewType() === "modal"`로 전환되어 모달 하단 확인/삭제 버튼 표시.

### 8.3 내부에 SdSheet 포함 (복합 상세)

상세 폼 안에 컬렉션 편집을 넣을 때 `<sd-sheet>`를 `#contentTpl` 안에 배치한다 (`<sd-data-sheet>` 사용 금지):

```html
<sd-data-detail>
  <ng-template #contentTpl>
    <div class="flex-column fill p-default">
      <!-- 상단 단일 필드 -->
      <div class="form-box-inline">
        <div>
          <label>PL일자</label>
          <sd-textfield [type]="'date'" [(value)]="data().date" (valueChange)="mark(data)" />
        </div>
      </div>

      <!-- 하위 컬렉션 -->
      <div class="flex-fill">
        <sd-sheet [items]="data().boxes" [selectMode]="'multi'" ...>
          <sd-sheet-column [key]="'seq'" [header]="'박스#'">
            <ng-template [cell]="data().boxes" let-item let-edit="edit">
              <sd-textfield
                [inset]="true" [size]="'sm'" [type]="'number'"
                [readonly]="!edit" [(value)]="item.seq" (valueChange)="mark(data)"
              />
            </ng-template>
          </sd-sheet-column>
        </sd-sheet>
      </div>
    </div>
  </ng-template>
</sd-data-detail>
```

참고: `InboundInstructionDetail.ts:85-522`.

### 8.4 toolTpl로 가져오기/커스텀 기능

사용자 권한 복사 등 form submit과 별개인 보조 기능은 `#toolTpl`에 배치.

```html
<sd-data-detail>
  <ng-template #toolTpl>
    <sd-form (submit)="onImportFormSubmit()">
      <div class="form-box-inline">
        <div>
          <label>가져오기</label>
          <sd-shared-data-select [items]="sharedUsers.items()" [(value)]="copySourceId" />
        </div>
        <div>
          <sd-button [type]="'submit'" [disabled]="copySourceId() == null">가져오기</sd-button>
        </div>
      </div>
    </sd-form>
  </ng-template>

  <ng-template #contentTpl>
    <!-- 메인 폼 -->
  </ng-template>
</sd-data-detail>
```

참고: `UserPermissionDetail.ts:45-81`.

## 9. 관용 규칙

### 9.1 `mark(data)` 호출

필드 변경마다 `(valueChange)="mark(data)"` 호출하여 변경 감지 유발. 이 호출이 없으면 snapshot과의 diff가 제대로 안 되어 `submit` 시 "변경사항 없음" 처리될 수 있다.

```html
<sd-textfield [(value)]="data().name" (valueChange)="mark(data)" />
```

### 9.2 신규 모드 처리

`load()`의 반환값에서 `isNew: true`를 지정하면:
- 최종수정 정보 숨김
- 삭제 버튼 숨김 (`!dataInfo().isNew` 조건)
- `submit` 시 "변경사항 없음" 체크 스킵 (무조건 저장 가능)

```typescript
override async load() {
  if (this.itemId() == null) {
    return {
      data: {} as IData,  // 초기값
      info: { isNew: true, isDeleted: false, lastModifiedAt: undefined, lastModifiedBy: undefined },
    };
  }
  // ... 기존 로드
}
```

### 9.3 `prepareRefreshEffect`로 외부 input 연동

`itemId` input이 바뀌면 자동 reload:

```typescript
itemId = input<number>();

override prepareRefreshEffect() {
  this.itemId();  // 읽기만 하면 effect 의존성 등록됨
}
```

### 9.4 `submit` 반환값과 close emit

`submit(data)`가 truthy 값을 반환하면:
1. `"저장되었습니다."` 토스트
2. `close.emit(result)` (모달 닫힘 + 부모에 결과 전달)
3. 내부 refresh (snapshot 갱신)

`undefined` 반환 시 close emit 생략 (예: 확인 취소, 검증 실패).

### 9.5 `toggleDelete` 반환값과 close emit

`toggleDelete(del)`가 truthy 값을 반환하면:
1. `"삭제되었습니다."` / `"복구되었습니다."` 토스트
2. `close.emit(result)` — 모달 닫힘
3. refresh는 자동으로 이루어지지 않음 (모달이 닫히므로)

삭제/복구를 취소하려면 `undefined` 반환.

```typescript
override async toggleDelete(del: boolean) {
  if (del && !confirm("삭제하시겠습니까?")) return undefined;
  // ... DB 처리
  return true;
}
```

### 9.6 `doSubmit(opt?)` 옵션

| 옵션 | 효과 |
|---|---|
| `permCheck: true` | `canEdit()` 검사 후 호출 (form submit 핸들러에서 사용) |
| `hideNoChangeMessage: true` | "변경사항이 없습니다" 토스트 억제 (프로그래밍 저장 시) |

```typescript
// form submit에서
async onSubmit() {
  await this.parent.doSubmit({ permCheck: true });
}

// 프로그래밍 저장 (예: 특정 버튼)
async onToggleInstructionButtonClick() {
  this.data().instructionDate = new DateOnly();
  await this.doSubmit();  // opt 없음 = 메시지 표시
}

// 조용한 저장 (예: 출력 전 자동 저장)
await this.doSubmit({ hideNoChangeMessage: true });
```

### 9.7 `R` 제네릭으로 커스텀 close 결과

기본 `R = boolean`이지만 custom 결과를 모달 caller에게 전달해야 할 때 지정:

```typescript
interface FooResult { upsertedId: number; }

export class FooDetail extends SdDataDetailBase<IData, FooResult> {
  override async submit(data: IData): Promise<FooResult | undefined> {
    const id = await this._upsert(data);
    return { upsertedId: id };
  }
}

// caller
const result = await this._sdModal.showAsync({ type: FooDetail, ... });
// result: FooResult | undefined
```

## 10. 실전 예시

### 10.1 페이지 영역 디테일 (UserPermissionDetail 축약)

참고: `D:/workspaces-14/adtek/packages/client-admin/src/app/home/base/user-permission/UserPermissionDetail.ts`.

```typescript
@Component({
  selector: "app-user-permission-detail",
  standalone: true,
  imports: [SdDataDetail, SdForm, SdSharedDataSelect, SdPermissionTable, SdButton, SdItemOfTemplate],
  template: `
    <sd-data-detail>
      <ng-template #toolTpl>
        <sd-form (submit)="onImportFormSubmit()">
          <div class="form-box-inline">
            <div>
              <label>가져오기</label>
              <sd-shared-data-select
                [items]="sharedUsers.items()"
                [(value)]="permCopySourceUserId"
              />
            </div>
            <div>
              <sd-button [type]="'submit'" [disabled]="permCopySourceUserId() == null">
                가져오기
              </sd-button>
            </div>
          </div>
        </sd-form>
      </ng-template>

      <ng-template #contentTpl>
        <div class="fill p-sm">
          <sd-permission-table
            [items]="permissions()"
            [(value)]="data"
            [disabled]="!canEdit()"
          />
        </div>
      </ng-template>
    </sd-data-detail>
  `,
})
export class UserPermissionDetail extends SdDataDetailBase<Record<string, boolean>> {
  private readonly _sdAppStructure = inject(SdAppStructureProvider);
  private readonly _appOrm = inject(AppOrmProvider);

  perms = injectPermsSignal(["base.user-permission"], ["use", "edit"]);

  userId = input.required<number>();
  permCopySourceUserId = signal<number | undefined>(undefined);

  permissions = computed(() =>
    this._sdAppStructure.getPermissionsByStructure(this._sdAppStructure.items()),
  );
  sharedUsers = useSharedSignal("사용자");

  override canUse = computed(() => this.perms().includes("use"));
  override canEdit = computed(() => this.perms().includes("edit"));

  override prepareRefreshEffect() {
    this.userId();
  }

  override async load() {
    const data = await this._getDataByUserId(this.userId());
    return {
      data,
      info: {
        isNew: false,
        isDeleted: false,
        lastModifiedAt: undefined,
        lastModifiedBy: undefined,
      },
    };
  }

  private async _getDataByUserId(userId: number) { /* ORM 조회 */ }

  async onImportFormSubmit() {
    if (this.busyCount() > 0 || !this.canEdit()) return;
    if (this.permCopySourceUserId() == null) return;
    if (!this.checkIgnoreChanges()) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      this.data.set(await this._getDataByUserId(this.permCopySourceUserId()!));
    });
    this.busyCount.update((v) => v - 1);
  }

  override async submit(data: Record<string, boolean>): Promise<boolean> {
    await this._appOrm.connectAsync(async (db) => {
      // 권한 upsert 로직
    });
    return true;
  }
}
```

**포인트**:
- `#toolTpl`로 form submit과 별개인 "가져오기" 기능 제공
- `prepareRefreshEffect`로 `userId` 변경 시 자동 reload
- `this.busyCount.update(...)` / `this._sdToast.try(...)`로 커스텀 비동기 제어

### 10.2 복합 상세 (내부 sd-sheet 포함, InboundInstructionDetail 축약)

참고: `D:/workspaces-14/adtek/packages/client-admin/src/app/home/inventory/inbound-instruction/InboundInstructionDetail.ts`.

```typescript
@Component({
  selector: "app-inbound-instruction-detail",
  standalone: true,
  imports: [SdDataDetail, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate, SdTextfield, /* ... */],
  template: `
    <sd-data-detail>
      <ng-template #toolTpl>
        @if (data().state === "작성") {
          <sd-button [theme]="'link-info'" (click)="onToggleInstructionButtonClick()">
            입고지시
          </sd-button>
        }
        @if (data().state !== "작성") {
          <sd-button [theme]="'link-warning'" (click)="onInstructionPaperPrintButtonClick()">
            입고지시서 출력
          </sd-button>
        }
      </ng-template>

      <ng-template #contentTpl>
        <div class="flex-column fill p-default">
          <div class="form-box-inline">
            <div>
              <label>PL일자</label>
              <sd-textfield [type]="'date'" [required]="true" [disabled]="!canEdit()"
                [(value)]="data().date" (valueChange)="mark(data)" />
            </div>
            <!-- ... 상태 라벨 등 -->
          </div>

          <div class="flex-fill">
            <sd-sheet
              [items]="data().boxes"
              [selectMode]="'multi'"
              [(selectedItems)]="selectedBoxes"
            >
              @if (canEdit()) {
                <sd-sheet-column [fixed]="true" [key]="'isDeleted'">
                  <ng-template [cell]="data().boxes" let-item>
                    <!-- 삭제/복구 아이콘 -->
                  </ng-template>
                </sd-sheet-column>
              }
              <sd-sheet-column [key]="'seq'" [header]="'박스#'">
                <ng-template [cell]="data().boxes" let-item let-edit="edit">
                  <sd-textfield
                    [inset]="true" [size]="'sm'" [type]="'number'"
                    [required]="true" [disabled]="!canEdit()" [readonly]="!edit"
                    [(value)]="item.seq" (valueChange)="mark(data)"
                  />
                </ng-template>
              </sd-sheet-column>
              <!-- ... 추가 컬럼 -->
            </sd-sheet>
          </div>
        </div>
      </ng-template>
    </sd-data-detail>
  `,
})
export class InboundInstructionDetail extends SdDataDetailBase<IData> {
  private readonly _appOrm = inject(AppOrmProvider);

  instructionId = input.required<number>();
  selectedBoxes = signal<IDataBox[]>([]);

  override canUse = computed(() => this.perms().includes("use"));
  override canEdit = computed(() => this.perms().includes("edit") && this.data().state === "작성");

  override prepareRefreshEffect() {
    this.instructionId();
  }

  override async load() {
    return this._appOrm.connectAsync(async (db) => {
      const data = /* ORM 조회 */;
      return {
        data,
        info: { isNew: false, isDeleted: false, lastModifiedAt: undefined, lastModifiedBy: undefined },
      };
    });
  }

  override async toggleDelete(_del: boolean) {
    if (!confirm("정말 삭제하시겠습니까?")) return undefined;
    await this._appOrm.connectAsync(async (db) => { /* 삭제 */ });
    return true;
  }

  override async submit(data: IData): Promise<boolean | undefined> {
    if (data.boxes.some((b) => b.isDeleted)) {
      if (!confirm("정말 삭제하시겠습니까?")) return undefined;
    }
    await this._appOrm.connectAsync(async (db) => { /* upsert + diff 처리 */ });
    return true;
  }

  async onToggleInstructionButtonClick() {
    this.data().instructionDate = new DateOnly();
    await this.doSubmit();  // 커스텀 버튼 → 프로그래밍 저장
  }

  async onInstructionPaperPrintButtonClick() {
    this.data().printingDate = new DateOnly();
    await this.doSubmit({ hideNoChangeMessage: true });  // 조용한 저장
    await this._sdPrint.printAsync({ type: InboundInstructionPaperPrintTemplate, /* ... */ });
  }

  protected readonly mark = mark;
}
```

**포인트**:
- `#toolTpl`로 state별 커스텀 버튼 (입고지시/취소/출력)
- `#contentTpl` 내부에 `<sd-sheet>`로 하위 컬렉션 편집 (데이터 시트 추상화 중첩 안 함)
- 커스텀 버튼 핸들러에서 `this.doSubmit({ hideNoChangeMessage: true })`로 조용한 저장

---

## Cross-reference

- `SdDataSheet` — 시트 CRUD 추상화. → `features-data-sheet.md`
- `SdDataSelectButton` — 모달 선택 버튼 추상화. → `features-data-select-button.md`
- `SdBaseContainer` — 페이지/모달/뷰 공통 컨테이너. → `features.md`
- `SdModalContentDef<R>` — 모달 컨텐츠 인터페이스. → `provider-types.md`
- `SdModalProvider.showAsync()` — 프로그래밍 방식 모달 호출. → `providers.md`
- `getOrmDataEditToastErrorMessage` — 저장 에러 메시지 변환. `SdDataDetailBase` 내부에서 자동 사용.
