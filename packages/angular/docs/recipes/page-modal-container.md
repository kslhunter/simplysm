# Recipe: 페이지/모달 컨테이너 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` 표준 컴포넌트를 **직접 조립**하여 "하나의 컴포넌트를 페이지·모달·제어(control) 뷰에서 모두 재사용"하는 구조를 만든다. 과거 `<sd-base-container>`가 감추고 있던 분기·타이틀 계산·권한 제한·초기화 숨김을 화면 내부에 인라인으로 풀어쓴다.

## 1. Overview

- 제거된 추상화: `SdBaseContainer`(`<sd-base-container>`)
- 대체: 소비 컴포넌트가 표준 조각을 `@if` 분기로 직접 조립
- 조립 요소:
  - `<sd-busy-container [busy] [message]>` — 전체 busy 오버레이 (`@simplysm/angular` → `SdBusyContainer`, `busy`·`message`·`type` input)
  - `<sd-topbar-container>` + `<sd-topbar>` — 페이지 뷰에서 상단 헤더
  - `@if/@else if` — 뷰 타입 분기
  - `injectViewTypeSignal()` — 라우트·모달 컨텍스트에 따라 `"page" | "modal" | "control"` 판정
  - `computed()` — `header ?? 모달 타이틀 ?? 앱 구조 타이틀` 우선순위 타이틀 계산
- 유지되는 조력자: `SdActivatedModalProvider`, `SdAppStructureProvider`, `SdSystemLogProvider`, `injectCurrentPageCodeSignal`, `injectFullPageCodeSignal`

## 2. 언제 사용하는가

| 상황 | 적용 여부 |
|---|---|
| 하나의 화면 컴포넌트를 페이지와 모달 양쪽에서 재사용 | 레시피 전체 적용 (modal 용도는 아래 두 행 중 하나 확정) |
| 페이지 뷰만 필요 (topbar 있는 라우트 화면) | 페이지 블록만 사용, 모달·control 분기 생략 가능 |
| 다른 화면에서 항목을 고르는 **선택 모달** (`SdSelectModal<T>` 구현, `SdModalProvider.showAsync()`로 열림) | 모달 블록 + 하단 액션 바(선택 해제·확인) + `close.emit`. 상세 → [crud-list.md §8 확장 D](./crud-list.md#8-확장-d-선택-모달-전환) |
| 부모 레코드의 자식 목록·이력을 input으로 받아 **조회만** 하는 modal | 모달 블록만 사용, `SdSelectModal<T>` 계약 없음, SdModal 기본 "X"로 닫기. 상세 → [crud-list.md §9 확장 E](./crud-list.md#9-확장-e-조회-전용-modal) |
| 다른 화면의 영역 일부로 삽입되는 컨트롤 | control 분기(`@else` 블록)만 사용. topbar·모달 분기 생략 |
| 커스텀 단축키·이탈 확인이 필요 | `SdCommandDirective` + `setupCanDeactivate`를 본문에 직접 부착 (본 레시피 범위 외, `features-data-detail.md`류 레시피 참조) |

## 3. 완성 예제

아래는 하나의 컴포넌트가 **페이지·모달·control 뷰 모두**를 커버하는 완성 형태다. 필요 없는 분기는 삭제하여 단순화할 수 있다.

```typescript
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle } from "@ng-icons/tabler-icons";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import {
  injectCurrentPageCodeSignal,
  injectFullPageCodeSignal,
  injectViewTypeSignal,
  SdActivatedModalProvider,
  SdAppStructureProvider,
  SdBusyContainer,
  SdSystemLogProvider,
  SdTopbar,
  SdTopbarContainer,
} from "@simplysm/angular";

@Component({
  selector: "app-foo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainer, SdTopbarContainer, SdTopbar, NgIcon],
  template: `
    <sd-busy-container [busy]="busy()" [message]="busyMessage()">
      @if (initialized() == null || initialized()) {
        @if (restricted()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br />
            <br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (viewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>
              <!-- 페이지 topbar 보조 영역(버튼·메뉴 등) 필요 시 여기 -->
            </sd-topbar>
            <div class="fill">
              <!-- 본문: 페이지 레이아웃으로 채우기 -->
            </div>
          </sd-topbar-container>
        } @else if (viewType() === "modal") {
          <!--
            modal 용도 2종 — 반드시 사전에 확정한다 (추측으로 "modal = 선택 모달"로 단정 금지).
            (a) 선택 모달: 다른 화면에서 항목을 골라 close.emit으로 돌려줌. `implements SdSelectModal<T>`
                + selectMode/selectedItemKeys input + close output + 하단 액션 바. → ./crud-list.md §8 확장 D
            (b) 조회 전용 modal: 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 보여줌.
                SdSelectModal<T> 계약 부착 금지, SdModal 기본 "X"로 닫음. → ./crud-list.md §9 확장 E
          -->
          <div class="flex-column fill">
            <div class="flex-fill">
              <!-- 본문: 모달 내부 컨텐츠 -->
            </div>
            <!-- 모달 하단 액션(확인/취소 버튼 등) 필요 시:
            <div class="bdt bdt-theme-gray-lightest">
              ...
            </div>
            -->
          </div>
        } @else {
          <!-- 본문: control 뷰(다른 화면의 영역으로 삽입) -->
        }
      }
    </sd-busy-container>
  `,
})
export class FooPage {
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdAppStructure = inject(SdAppStructureProvider);
  private readonly _sdSystemLog = inject(SdSystemLogProvider);

  private readonly _fullPageCode = injectFullPageCodeSignal();
  private readonly _currPageCode = injectCurrentPageCodeSignal();

  protected readonly viewType = injectViewTypeSignal();

  header = input<string>();
  initialized = input<boolean | undefined>(undefined);
  restricted = input(false, { transform: booleanAttribute });
  busy = input(false, { transform: booleanAttribute });
  busyMessage = input<string>();

  protected readonly modalOrPageTitle = computed(() => {
    try {
      return (
        this.header() ??
        this._sdActivatedModal?.modalComponent()?.title() ??
        this._sdAppStructure.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode())
      );
    } catch (err) {
      void this._sdSystemLog.writeAsync("warn", `modalOrPageTitle 계산 중 에러: ${String(err)}`);
      return "";
    }
  });

  protected readonly tablerAlertTriangle = tablerAlertTriangle;
}
```

## 4. 분해 설명

각 블록의 역할과 원본 `SdBaseContainer` 코드 대응 지점:

| 블록 | 역할 | 원본 대응 |
|---|---|---|
| `<sd-busy-container [busy] [message]>` | 화면 전체에 busy 오버레이를 씌운다. 자식 전체를 감싼다 | `sd-base-container.ts:42` |
| `@if (initialized() == null || initialized())` | `undefined` 또는 `true`일 때만 자식 렌더. `false`면 콘텐츠 전부 숨김(초기화 전 잔상 방지) | `sd-base-container.ts:43` |
| `@if (restricted())` | 권한 없음 시 경고 메시지를 표시하고 콘텐츠는 렌더링하지 않음 | `sd-base-container.ts:44-51` |
| `@else if (viewType() === "page")` | 페이지 뷰: `<sd-topbar-container>` + `<sd-topbar>` 헤더에 계산된 제목 표시 | `sd-base-container.ts:52-63` |
| `@else if (viewType() === "modal")` | 모달 뷰: flex-column 레이아웃, 하단 액션은 선택 | `sd-base-container.ts:64-74` |
| `@else` | control 뷰: 본문만 raw 렌더링 | `sd-base-container.ts:75-77` |
| `modalOrPageTitle` computed | 제목 우선순위 계산 + 예외 시 빈 문자열 + `writeAsync("warn", ...)` | `sd-base-container.ts:102-113` |

## 5. 뷰 타입 결정

`injectViewTypeSignal()`은 인자 없이 호출한다. 내부 판정 규칙:

1. `SdActivatedModalProvider`가 주입 가능하면 **`"modal"`**
2. 현재 활성 라우트의 컴포넌트 `selector`가 이 화면의 `<host>.tagName`과 일치하면 **`"page"`**
3. 그 외는 **`"control"`** (다른 화면의 내부에 삽입된 영역)

일반적으로 이 자동 판정으로 충분하다. 수동 오버라이드가 필요한 특수 상황(예: 특정 페이지 안에 자기 자신을 모달처럼 보이게 하고 싶은 경우)에는 아래와 같이 **`injectViewTypeSignal()`은 필드 초기화 시점에 한 번만 호출**하고 `computed`에서는 signal만 재사용한다.

```typescript
override = input<SdViewType>();
private readonly _autoViewType = injectViewTypeSignal();
protected readonly viewType = computed(() => this.override() ?? this._autoViewType());
```

`injectViewTypeSignal()` 내부는 `inject(SdActivatedModalProvider, { optional: true })` · `inject(ActivatedRoute, { optional: true })`를 호출한다. Angular `inject()`는 injection context(생성자 실행 중 또는 필드 초기화 시점) 안에서만 유효하므로, `computed` 콜백이나 effect 안에서 호출하면 `NG0203` 런타임 에러가 발생한다. 이 오버라이드는 추상화 복원을 부추기므로 **기본은 자동 판정으로 쓰기**를 권장한다.

## 6. 타이틀 우선순위

타이틀은 **화면 내부의 `computed`로 직접 계산**한다. 우선순위:

1. `header()` input이 지정되어 있으면 그 값
2. 모달 컨텍스트면 `SdActivatedModalProvider.modalComponent()?.title()`
3. 페이지 컨텍스트면 `SdAppStructureProvider.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode())`

`getTitleByFullCode`는 앱 구조(`items`)에 해당 fullCode 항목이 없으면 `Error`를 던진다. 따라서 `try/catch`로 래핑하고 실패 시 빈 문자열을 반환하면서 `SdSystemLogProvider.writeAsync("warn", ...)`으로 경고를 남긴다. 이는 화면 생성 시점에 앱 구조 로딩이 지연되는 상황에서 화면 전체가 깨지지 않도록 하기 위함이다.

## 7. 주의사항

- **신규 유틸 함수를 추출하지 말 것.** `useBaseContainer()`, `computeModalOrPageTitle()` 같은 공통 헬퍼를 도입하면 이 레시피가 제거한 추상화가 다시 생긴다. 세 줄짜리 `computed`를 화면마다 반복하는 편이 낫다.
- **본문 채우기는 화면의 책임이다.** 위 예제의 `<!-- 본문: ... -->` 주석 자리에 `<sd-sheet>`(리스트), `<sd-form>`(상세), 임의 HTML 등 화면별 콘텐츠를 삽입한다. 리스트·상세 화면 조립은 `crud-list.md`·`crud-detail.md` 레시피 참조.
- **modal 뷰 = 반드시 선택 모달인 것은 아니다.** `viewType() === "modal"`만으로 `SdSelectModal<T>` 계약을 반사적으로 부착하지 않는다. modal 용도는 (a) 선택 모달(`close.emit` + 하단 액션 바, [§8 확장 D](./crud-list.md#8-확장-d-선택-모달-전환)) / (b) 조회 전용 modal(계약 없음, SdModal 기본 "X"로 닫기, [§9 확장 E](./crud-list.md#9-확장-e-조회-전용-modal))로 갈린다. 실수 패턴·상세 워딩은 [`crud-list.md` §13.1](./crud-list.md#modal-뷰--반드시-선택-모달인-것은-아니다) 참조.
