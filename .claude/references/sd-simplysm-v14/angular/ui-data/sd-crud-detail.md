# `SdCrudDetail`

> **읽어야 하는 상황**: CRUD 상세 화면(폼 + 저장)을 만들 때. 목록 화면은 [`SdCrudList`](./sd-crud-list.md) 참조.

CRUD 상세 화면 스캐폴드. `SdBaseContainer`를 내부에 사용하며, 폼 제출(`Ctrl+S` 저장), readonly 모드, viewType별 저장 버튼 배치를 제공한다.

## Import

```typescript
import { SdCrudDetail } from "@simplysm/angular";
```

## Selector

`sd-crud-detail`

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `initialized` | `boolean` | `false` | 외부 초기화 완료 여부. `true`일 때만 콘텐츠 렌더링. |
| `restricted` | `boolean` | `false` | `true`이면 "사용권한이 없습니다" 메시지 표시 (SdBaseContainer에 전달). |
| `readonly` | `boolean` | `false` | 읽기 전용 모드. `true`이면 저장 버튼이 숨겨지고 `<sd-form>` 대신 일반 `<div>`로 콘텐츠를 감싼다. |
| `viewType` | `SdViewType` | **required** | `"page"` \| `"modal"` \| `"control"`. 저장 버튼 위치와 레이아웃을 결정한다. |

## Two-way Bindings (model)

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `ready` | `boolean` | `false` | SdBaseContainer의 공유 데이터 로딩 완료 시 `true`. |
| `busyCount` | `number` | `0` | 로딩 카운터. SdBaseContainer에 전달. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `submit` | `void` | 폼 제출 시 발생. 저장 버튼 클릭, `Ctrl+S` 단축키, 또는 폼 내부 `Enter` 키 모두 이 이벤트를 트리거한다. |

## Content Children (ng-template)

### `#commandTpl` — 추가 명령 버튼 영역

viewType에 따라 렌더링 위치가 달라진다:

| viewType | 렌더링 위치 | 저장 버튼과의 관계 |
|----------|------------|-------------------|
| `page` | `<sd-topbar>` 내부 (저장 버튼 우측) | 저장 버튼 뒤에 이어서 렌더링 |
| `control` | 상단 명령 영역 (저장 버튼 우측) | 저장 버튼 뒤에 이어서 렌더링 |
| `modal` | 상단 명령 영역 | 저장 버튼은 하단에 별도 배치되므로 독립적 |

```html
<ng-template #commandTpl>
  @if (canEdit()) {
    <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
      <ng-icon [svg]="tablerEraser" />
      삭제
    </sd-button>
  }
  <sd-button [theme]="'link-info'" (click)="onSomeAction()">
    <ng-icon [svg]="tablerSend" />
    추가동작
  </sd-button>
</ng-template>
```

### `#bottomCommandTpl` — 하단 명령 버튼 영역

하단 영역은 `viewType() === "modal" || bottomCommandTplRef()` 조건으로 표시된다. 즉, modal viewType이면 항상 표시되고, 다른 viewType에서는 사용자가 `#bottomCommandTpl`을 제공할 때만 표시된다. 하단 영역이 표시되면 "확인" 버튼이 **항상** 함께 추가된다 (viewType 무관). `#bottomCommandTpl`의 내용은 "확인" 버튼 **좌측**에 `flex-fill flex-row main-align-start gap-sm` 레이아웃으로 배치된다.

```html
<ng-template #bottomCommandTpl>
  <sd-button [size]="'sm'" (click)="onSomeBottomAction()">
    추가 하단 버튼
  </sd-button>
</ng-template>
```

## Host Directives

- `SdCommandDirective` — `Ctrl+S` 키보드 단축키를 `sdSaveCommand` 이벤트로 변환. 이 이벤트가 발생하면 내부 `<sd-form>`의 `requestSubmit()`을 호출하여 폼 유효성 검사 후 `submit` 이벤트를 발생시킨다.

## viewType별 저장 버튼 배치 상세

### `viewType="page"`

```
┌─ sd-topbar ─────────────────────────────────────────┐
│  <h4>{viewTitle}</h4>                               │
│  [저장 버튼: link-primary] [#commandTpl 내용]       │
└─────────────────────────────────────────────────────┘
┌─ 콘텐츠 ────────────────────────────────────────────┐
│  <sd-form>                                          │
│    <ng-content /> ← 폼 필드들                       │
│  </sd-form>                                         │
└─────────────────────────────────────────────────────┘
```

- 저장 버튼: `<sd-button [theme]="'link-primary'">` + floppy 아이콘 + "저장 (CTRL+S)"
- `readonly=true`이면 저장 버튼 숨김, `<sd-form>` 대신 `<div class="fill">`

### `viewType="control"`

```
┌─ 상단 명령 영역 ────────────────────────────────────┐
│  [저장 버튼: primary] [#commandTpl 내용]            │
└─────────────────────────────────────────────────────┘
┌─ 콘텐츠 ────────────────────────────────────────────┐
│  <sd-form>                                          │
│    <ng-content /> ← 폼 필드들                       │
│  </sd-form>                                         │
└─────────────────────────────────────────────────────┘
┌─ 하단 명령 영역 (bottomCommandTpl이 있을 때만) ─────┐
│  [#bottomCommandTpl 내용 (좌측)]   [확인 버튼 (우측)]│
└─────────────────────────────────────────────────────┘
```

- 저장 버튼: `<sd-button [theme]="'primary'">` + floppy 아이콘 + "저장 (CTRL+S)"
- bottomCommandTpl을 제공하면 하단에 확인 버튼도 함께 표시됨 (저장 버튼과 동일 동작: `formCtrl.requestSubmit()`)

### `viewType="modal"`

```
┌─ 상단 명령 영역 (commandTpl이 있을 때만) ───────────┐
│  [#commandTpl 내용]                                 │
└─────────────────────────────────────────────────────┘
┌─ 콘텐츠 ────────────────────────────────────────────┐
│  <sd-form>                                          │
│    <ng-content /> ← 폼 필드들                       │
│  </sd-form>                                         │
└─────────────────────────────────────────────────────┘
┌─ 하단 명령 영역 (항상 표시) ────────────────────────┐
│  [#bottomCommandTpl 내용 (좌측)]   [확인 버튼 (우측)]│
└─────────────────────────────────────────────────────┘
```

- 확인 버튼: `<sd-button [size]="'sm'" [theme]="'primary'">확인</sd-button>` (클릭 시 `formCtrl.requestSubmit()` → `submit` 이벤트)
- `readonly=true`여도 확인 버튼은 항상 표시됨 (modal viewType 조건으로 하단 영역이 렌더링되므로)

## readonly 모드 상세

`readonly=true`일 때:
- 모든 viewType에서 저장 버튼이 숨겨진다
- `<sd-form>` 대신 `<div class="fill">`로 콘텐츠를 감싼다 (폼 유효성 검사 비활성)
- `Ctrl+S` 단축키는 여전히 동작하지만 `formCtrl`이 없으므로 아무 효과 없음
- `#commandTpl`이 있으면 해당 영역은 여전히 표시된다 (삭제 버튼 등 readonly에서도 필요한 명령)

## Usage: control viewType (master-detail 패턴)

```typescript
@Component({
  template: `
    <sd-crud-detail
      [viewType]="'control'"
      [initialized]="initialized()"
      [(busyCount)]="busyCount"
      [readonly]="!canEdit()"
      (submit)="onSubmit()"
    >
      <ng-template #commandTpl>
        @if (canEdit()) {
          <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
            <ng-icon [svg]="tablerEraser" />
            삭제
          </sd-button>
        }
        <sd-button [theme]="'link-info'" (click)="onSpecialAction()">
          <ng-icon [svg]="tablerSend" />
          특별동작
        </sd-button>
      </ng-template>

      <div class="fill p-default">
        <sd-dock-container>
          <sd-dock class="pb-sm">
            <div class="form-box-inline p-sm-default bd-radius-default bd bd-trans-light fill">
              <div>
                <label>문서번호</label>
                <div>{{ data().code }}</div>
              </div>
              <div>
                <label>날짜</label>
                <sd-textfield
                  [type]="'date'"
                  [disabled]="!canEdit()"
                  [(value)]="data().dueDate"
                  (valueChange)="mark(data)"
                />
              </div>
            </div>
          </sd-dock>

          <!-- 탭이나 서브 리스트 등 -->
          <div class="fill">
            <app-sub-list [(items)]="data().items" (itemsChange)="mark(data)" />
          </div>
        </sd-dock-container>
      </div>
    </sd-crud-detail>
  `,
})
export class MyDetail {
  instructionId = input.required<number>();
  submitted = output<boolean>();

  initialized = signal(false);
  busyCount = signal(0);
  data = signal<IData>({ code: "", items: [] });

  private _orgData: IData | undefined;

  canEdit = computed(() => this.perms().includes("edit") && this.data().state === "작성");

  constructor() {
    effect(() => {
      this.instructionId(); // 변경 감지 트리거

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    setupCanDeactivate(() => this._checkIgnoreChanges());
  }

  async onSubmit(): Promise<void> {
    if (this.busyCount() > 0) return;
    // ... 저장 로직
    await this._refresh();
    this.submitted.emit(true);
  }
}
```

## Usage: modal viewType

```html
<sd-crud-detail
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [viewType]="'modal'"
  (submit)="onSubmit()"
>
  <div class="p-default">
    <div class="form-box-inline">
      <div>
        <label>이름</label>
        <sd-textfield [(value)]="data().name" [required]="true" />
      </div>
    </div>
  </div>
</sd-crud-detail>
```

## Anti-patterns

```html
<!-- ❌ readonly일 때 commandTpl 안에 저장 버튼을 별도로 넣지 않는다 -->
<!-- SdCrudDetail이 viewType에 맞는 저장 버튼을 자동 배치한다 -->
<ng-template #commandTpl>
  <sd-button (click)="onSave()">저장</sd-button>  <!-- ❌ -->
</ng-template>

<!-- ✅ commandTpl에는 저장 외의 추가 명령만 넣는다 -->
<ng-template #commandTpl>
  <sd-button [theme]="'danger'" (click)="onDelete()">삭제</sd-button>  <!-- ✅ -->
</ng-template>
```
