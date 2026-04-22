# 페이지/모달 컨테이너 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` 표준 컴포넌트를 직접 조립해 하나의 컴포넌트를 page · modal · control 3뷰로 재사용한다. 추상 컨테이너(`<sd-base-container>` 류)가 감추던 분기·타이틀·권한·초기화 숨김을 화면 내부에 인라인으로 풀어 쓴다.

## When to use / When NOT to use

- ✅ 한 컴포넌트를 page · modal · control 중 둘 이상으로 재사용한다.
- ✅ page 전용 / modal 전용 / control 전용 화면도 본 레시피에서 필요한 분기만 골라 쓴다 (불필요한 분기는 삭제).
- ✅ `injectViewTypeSignal()`로 자동 판정된 뷰에 따라 topbar·하단 액션 바·본문 레이아웃을 선택한다.
- ❌ 단일 화면 컨테이너 추상(`<sd-base-container>`, `useBaseContainer()` 등) 재도입 — 분기·타이틀·권한이 다시 감춰져 화면별 변경이 어려워진다.
- ❌ 리스트 본문 조립이 필요할 때 — [`crud-list.md`](./crud-list.md) (시트·필터·페이징).
- ❌ 상세 폼 본문 조립이 필요할 때 — [`crud-detail.md`](./crud-detail.md) (폼·저장 흐름).
- ❌ modal 뷰의 (a) 다른 화면에서 항목을 골라 돌려주는 **선택 모달** — [`crud-list/extension-d-select-modal.md`](./crud-list/extension-d-select-modal.md).
- ❌ modal 뷰의 (b) 부모 레코드 자식 목록·이력을 input으로 받아 보여주는 **조회 전용 modal** — [`crud-list/extension-e-readonly-modal.md`](./crud-list/extension-e-readonly-modal.md).

## 전제조건

- `provideSdAngular({ clientName })` 등록 (앱 부트스트랩) — `SdBusyProvider`·`SdAppStructureProvider` 등 의존 provider가 함께 등록된다.
- page 뷰 사용 시: 라우트 등록 + `SdAppStructureProvider`에 페이지 코드·타이틀이 정의되어 있어야 `injectViewTitleSignal()`이 페이지 타이틀을 반환한다 (`packages/angular/src/core/routing/injectViewTitleSignal.ts:20`).
- modal 뷰 사용 시: `SdModalProvider.showAsync(...)`로 진입한다. `SdActivatedModalProvider`가 모달 컨텍스트에 자동 주입된다 (`packages/angular/src/core/modal/sd-activated-modal.provider.ts:8`).
- 공통 규칙: `injectViewTypeSignal()` 호출 시점, page 컴포넌트의 `<sd-topbar>` 소유 → [`_common-rules.md`](./_common-rules.md).

## 기본 레시피

3뷰를 모두 갖춘 최대 구성이다. 화면 요구에 따라 일부 분기·요소를 생략한다 (생략 기준은 [§ 변형](#변형) 참조).

```typescript
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle } from "@ng-icons/tabler-icons";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";
import {
  injectViewTitleSignal,
  injectViewTypeSignal,
  SdBusyContainer,
  SdTopbar,
  SdTopbarContainer,
} from "@simplysm/angular";

@Component({
  selector: "app-foo-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainer, SdTopbarContainer, SdTopbar, NgIcon],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      <!-- initialized() == null(미사용) 또는 true 일 때만 본문 렌더 — 초기 로딩 잔상 방지 -->
      @if (initialized() == null || initialized()) {
        @if (restricted()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br />
            <br />
            '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (viewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ viewTitle() }}</h4>
              <!-- 페이지 topbar 보조 영역(버튼·메뉴) 필요 시 여기 -->
            </sd-topbar>
            <div class="fill">
              <!-- 본문: 페이지 레이아웃으로 채우기 -->
            </div>
          </sd-topbar-container>
        } @else if (viewType() === "modal") {
          <!--
            modal 용도는 사전에 (a) 선택 모달 / (b) 조회 전용 modal 중 하나로 확정한다.
            (a) → ./crud-list/extension-d-select-modal.md
            (b) → ./crud-list/extension-e-readonly-modal.md
          -->
          <div class="flex-column fill">
            <div class="flex-fill">
              <!-- 본문: 모달 내부 컨텐츠 -->
            </div>
            <!-- 모달 하단 액션(확인/취소) 필요 시:
            <div class="bdt bdt-theme-gray-lightest">...</div>
            -->
          </div>
        } @else {
          <!-- 본문: control 뷰(다른 화면의 영역으로 삽입) -->
        }
      }
    </sd-busy-container>
  `,
})
export class FooView {
  // injectViewTypeSignal/injectViewTitleSignal은 inject() 내부 호출이므로
  // 필드 이니셜라이저(=생성자 시점)에서만 호출한다 → ./_common-rules.md
  protected readonly viewType = injectViewTypeSignal();
  protected readonly viewTitle = injectViewTitleSignal();

  initialized = input<boolean | undefined>(undefined);
  restricted = input(false, { transform: booleanAttribute });
  busy = input(false, { transform: booleanAttribute });
  busyMessage = input<string>();

  protected readonly tablerAlertTriangle = tablerAlertTriangle;
}
```

뷰 타입 자동 판정 규칙 (`packages/angular/src/core/routing/injectViewTypeSignal.ts:7`):

1. `SdActivatedModalProvider`가 주입 가능하면 `"modal"`
2. 활성 라우트의 컴포넌트 selector가 호스트 `tagName`과 일치하면 `"page"`
3. 그 외는 `"control"`

타이틀 자동 판정 규칙 (`packages/angular/src/core/routing/injectViewTitleSignal.ts:7`):

1. 모달 컨텍스트면 `SdActivatedModalProvider.modalComponent()?.title()`
2. 페이지 컨텍스트면 `SdAppStructureProvider.getTitleByFullCode(...)`
3. 예외 시 빈 문자열 (별도 try/catch 불필요)

## 변형

### 분기·요소 포함 조건 (생략 가능 기준)

기계적으로 모든 분기·요소를 포함하지 않는다. 화면 요구에 따라 아래 표대로 생략한다.

| 요소 | 포함 조건 | 생략하는 경우 예시 |
|------|----------|-------------------|
| `viewType() === "page"` 분기 + `<sd-topbar>` | 라우트로 진입하는 페이지 뷰가 필요할 때 | 모달/control 전용 컴포넌트 |
| `viewType() === "modal"` 분기 | 모달 뷰로도 재사용될 때 | page 전용 또는 control 전용 컴포넌트 |
| `@else` (control) 분기 | 다른 화면의 영역으로 삽입될 때 | page/modal 전용 컴포넌트 |
| `busy` / `busyMessage` input | 비동기 작업이 있어서 busy 표시가 필요할 때 | 동기적으로 렌더되는 화면 |
| `initialized` input | 초기 로딩 완료 전 본문을 숨겨야 할 때 | 초기 로딩 없이 즉시 렌더 가능한 화면 |
| `restricted` input + 권한 없음 메시지 | 권한 제어가 있는 화면 | 권한 제어가 없는 화면 |
| `injectViewTitleSignal()` | topbar에 타이틀을 표시할 때 | 타이틀 불필요한 화면 |

### page 전용 (modal·control 분기 생략)

```typescript
template: `
  <sd-busy-container [busy]="busy()">
    @if (initialized() == null || initialized()) {
      <sd-topbar-container>
        <sd-topbar><h4>{{ viewTitle() }}</h4></sd-topbar>
        <div class="fill"><!-- 본문 --></div>
      </sd-topbar-container>
    }
  </sd-busy-container>
`,
```

### modal 전용 (page·control 분기 생략)

```typescript
template: `
  <sd-busy-container [busy]="busy()">
    <div class="flex-column fill">
      <div class="flex-fill"><!-- 본문 --></div>
    </div>
  </sd-busy-container>
`,
```

이 분기 안에서 (a) 선택 모달 또는 (b) 조회 전용 modal을 결정한다 — 아래 "🚫 흔한 실수" 섹션의 "modal = 선택 모달 단정 금지" 참조.

### control 전용 (page·modal 분기 생략)

```typescript
template: `
  <sd-busy-container [busy]="busy()">
    <!-- 본문: 다른 화면의 영역으로 삽입 -->
  </sd-busy-container>
`,
```

control 뷰에는 `<sd-topbar-container>`·`<sd-topbar>`를 두지 않는다 (page 컴포넌트가 소유) — [`_common-rules.md` "page 컴포넌트가 <sd-topbar-container>와 <sd-topbar>를 소유한다"](./_common-rules.md#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다).

### viewType 수동 오버라이드 (권장하지 않음)

자동 판정으로 충분하지 않은 특수 상황(예: 특정 페이지 안에서 자기 자신을 모달처럼 보이게 함)에서만 사용한다. 추상화 복원을 부추기므로 기본은 자동 판정을 쓴다.

```typescript
import { computed, input } from "@angular/core";
import { injectViewTypeSignal, type SdViewType } from "@simplysm/angular";

override = input<SdViewType>();

// injectViewTypeSignal()은 필드 이니셜라이저에서 한 번만 호출, 이후 computed에서 signal만 읽는다.
private readonly _autoViewType = injectViewTypeSignal();
protected readonly viewType = computed(() => this.override() ?? this._autoViewType());
```

## 🚫 흔한 실수

### `<sd-base-container>` 재도입

```typescript
// ❌ 단일 컨테이너 추상 컴포넌트로 분기를 다시 감춘다
template: `
  <sd-base-container [busy]="busy()" [restricted]="restricted()">
    <ng-content />
  </sd-base-container>
`,

// ✅ 표준 조각을 화면이 직접 조립한다 (분기·타이틀·권한 가시화)
template: `
  <sd-busy-container [busy]="busy()">
    @if (restricted()) { ... }
    @else if (viewType() === "page") { <sd-topbar-container>... </sd-topbar-container> }
    @else if (viewType() === "modal") { ... }
    @else { ... }
  </sd-busy-container>
`,
```

**근거**: 추상 컨테이너는 page/modal/control 분기, 타이틀 계산, 권한 차단, 초기화 숨김을 한 번에 감추므로 화면별로 일부 동작만 바꾸기 어렵다. 표준 조각 직접 조립으로 분기를 인라인 노출한다.

### `useBaseContainer()` 같은 공통 헬퍼 추출

```typescript
// ❌ 공통 헬퍼로 다시 추상화한다 — 결국 <sd-base-container>와 동일한 함정
const { template } = useBaseContainer({ busy, restricted, initialized });

// ✅ 화면 코드에 인라인으로 둔다
@Component({ template: ` <sd-busy-container [busy]="busy()"> ... </sd-busy-container> ` })
```

**근거**: 헬퍼 함수 형태로 분기·요소를 묶으면 본 레시피가 제거한 추상화가 다시 생긴다. "한 번만 쓰는 화면별 조립 코드"라는 형태가 의도적이다.

### `viewType() === "modal"`만으로 선택 모달이라고 단정한다

```typescript
// ❌ modal 뷰면 무조건 SdSelectModal<T> 계약을 부착하고 close.emit으로 결과 반환을 기대한다
export class FooView implements SdSelectModal<FooItem> {
  selectMode = input<"single" | "multi">();
  selectedItemKeys = input<any[]>();
  close = output<FooItem[] | undefined>();
  // ...
}

// ✅ modal 용도를 사전에 (a)/(b) 중 하나로 확정하고 그 레시피를 따른다
// (a) 선택 모달: implements SdSelectModal<T> + 하단 액션 바 → ./crud-list/extension-d-select-modal.md
// (b) 조회 전용 modal: 계약 없음, SdModal 기본 "X"로 닫음 → ./crud-list/extension-e-readonly-modal.md
```

**근거**: `viewType() === "modal"`은 "모달 컨텍스트에서 렌더 중"만 알려준다. 선택 모달 계약(`SdSelectModal<T>`)은 호출하는 쪽이 `selectMode`를 넘기고 결과를 받는 시나리오 한정이며, 조회 전용 modal과는 input·output·하단 액션 바 구성이 다르다.

### `injectViewTypeSignal()` 호출 시점 위반 (NG0203)

`computed`/`effect`/일반 메서드 콜백 안에서 `injectViewTypeSignal()`을 호출하면 injection context를 벗어나 `NG0203` 런타임 에러가 발생한다. 필드 이니셜라이저(=생성자 시점)에서 한 번만 호출하고 이후엔 반환된 signal만 읽는다 — 상세·코드 예시는 [`_common-rules.md` "injectViewTypeSignal()은 생성자 또는 필드 이니셜라이저에서만 호출한다"](./_common-rules.md#injectviewtypesignal은-생성자-또는-필드-이니셜라이저에서만-호출한다).

## 관련 Entry

- [`_common-rules.md`](./_common-rules.md) — 차이: 4계열 진입점·확장에 걸친 횡단 규칙 (본 레시피의 `injectViewTypeSignal` 호출 시점·`<sd-topbar>` 소유 규칙 정의 위치).
- [`crud-list.md`](./crud-list.md) — 차이: 리스트 본문(시트·필터·페이징) 조립.
- [`crud-detail.md`](./crud-detail.md) — 차이: 상세 폼 본문(폼·저장 흐름) 조립.
- [`crud-list/extension-d-select-modal.md`](./crud-list/extension-d-select-modal.md) — 차이: modal 뷰의 (a) 선택 모달 계약·하단 액션 바.
- [`crud-list/extension-e-readonly-modal.md`](./crud-list/extension-e-readonly-modal.md) — 차이: modal 뷰의 (b) 조회 전용 패턴.
- [`crud-detail/extension-c-modal-view.md`](./crud-detail/extension-c-modal-view.md) — 차이: 상세 폼의 modal 분기(canDeactivate·하단 액션 템플릿).
- [`crud-detail/extension-d-control-view.md`](./crud-detail/extension-d-control-view.md) — 차이: 상세 폼의 control 분기(마스터-디테일 디테일 영역).
