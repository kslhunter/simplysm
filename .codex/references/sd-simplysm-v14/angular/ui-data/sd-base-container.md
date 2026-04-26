# `SdBaseContainer`

> **읽어야 하는 상황**: CRUD 페이지/모달/컨트롤의 기본 컨테이너가 필요할 때 (busy 관리, 권한 검사, viewType별 레이아웃 분기).

CRUD 페이지/모달/컨트롤의 기본 컨테이너. busy 상태 관리, 공유 데이터 초기화 대기, 접근 권한 검사, viewType별 레이아웃 분기를 제공한다.
보통 직접 사용하기보다 `SdCrudList`나 `SdCrudDetail`이 내부에서 사용한다. 목록-상세 분할 레이아웃(master-detail)처럼 커스텀 레이아웃이 필요할 때 직접 사용한다.

## Import

```typescript
import { SdBaseContainer } from "@simplysm/angular";
```

## Selector

`sd-base-container`

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `initialized` | `boolean` | `false` | 외부 초기화 완료 여부. `true`일 때만 내부 콘텐츠가 렌더링된다. 데이터 로딩이 끝난 뒤 `true`로 설정해야 한다. |
| `restricted` | `boolean` | `false` | `true`이면 "사용권한이 없습니다" 메시지를 표시하고 콘텐츠를 렌더링하지 않는다. |
| `viewType` | `SdViewType` | **required** | `"page"` \| `"modal"` \| `"control"`. 레이아웃 구조를 결정한다. |

## Two-way Bindings (model)

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `ready` | `boolean` | `false` | 공유 데이터(`SdSharedDataProvider.wait()`) 로딩 완료 시 컴포넌트 내부에서 `true`로 설정된다. 소비 컴포넌트는 이 값이 `true`가 된 후에 데이터 로딩을 시작해야 한다. |
| `busyCount` | `number` | `0` | 로딩 카운터. 0보다 크면 `SdBusyContainer`의 busy overlay가 표시된다. 비동기 작업 시작 시 `+1`, 완료 시 `-1`한다. |

## Content Children (ng-template)

| Template Ref | 렌더링 위치 | Description |
|---|---|---|
| `#topbarTpl` | `viewType="page"`일 때 `<sd-topbar>` 내부 | 탑바 우측에 버튼(저장, 커스텀 명령 등)을 배치한다. `viewType`이 `"page"`가 아니면 무시된다. |
| `#commandTpl` | 콘텐츠 영역 상단 | `p-default` 패딩, `flex-row gap-default` 레이아웃의 명령 영역. 하단에 `bdb bdb-theme-gray-lightest` 테두리가 그려진다. |
| `#bottomCommandTpl` | 콘텐츠 영역 하단 | `p-sm-default` 패딩, `flex-row main-align-end gap-sm` 레이아웃의 명령 영역. 상단에 `bdt bdt-theme-gray-lightest` 테두리가 그려진다. 모달의 "확인" 버튼 등에 사용된다. |

**`ng-content`**: 위 템플릿 외의 일반 콘텐츠는 `<ng-content>`로 투영되어 상단 명령 영역과 하단 명령 영역 사이의 `flex-fill` 영역에 렌더링된다.

## 내부 레이아웃 구조

```
<sd-busy-container [busy]="initialized && busyCount > 0">
  ┌─ restricted=true ─────────────────────────────────────┐
  │  "'{viewTitle}'에 대한 사용권한이 없습니다" 메시지     │
  └───────────────────────────────────────────────────────┘

  ┌─ viewType="page" ─────────────────────────────────────┐
  │  <sd-topbar-container>                                │
  │    <sd-topbar>                                        │
  │      <h4>{viewTitle}</h4>                             │
  │      [#topbarTpl 렌더링]                              │
  │    </sd-topbar>                                       │
  │    [#content 렌더링]                                  │
  │  </sd-topbar-container>                               │
  └───────────────────────────────────────────────────────┘

  ┌─ viewType="modal" | "control" ────────────────────────┐
  │  [#content 렌더링]                                    │
  └───────────────────────────────────────────────────────┘

  ┌─ #content ────────────────────────────────────────────┐
  │  <div class="flex-column fill">                       │
  │    [#commandTpl 영역] (있을 때만)                      │
  │    <div class="flex-fill">                            │
  │      <ng-content /> ← 메인 콘텐츠                     │
  │    </div>                                             │
  │    [#bottomCommandTpl 영역] (있을 때만)                │
  │  </div>                                               │
  └───────────────────────────────────────────────────────┘
</sd-busy-container>
```

## 초기화 순서 (lifecycle)

1. 컴포넌트 생성 시 `effect` 등록
2. `restricted=true`이면 → 즉시 `ready=true` (공유 데이터 로딩 불필요)
3. `restricted=false`이면 → `busyCount+1` → `SdSharedDataProvider.wait()` → `busyCount-1` → `ready=true`
4. 소비 컴포넌트의 `effect`에서 `ready()`가 `true`임을 감지 → 데이터 로딩 → `initialized=true`
5. `initialized=true`가 되면 콘텐츠 렌더링 시작

## 의존성

- `SdSharedDataProvider` (abstract, 소비 프로젝트에서 구현체 provide 필요)
- `SdToastProvider` (에러 래핑용)
- `injectViewTitleSignal()` — 현재 뷰 타이틀을 가져와 탑바 `<h4>`와 권한 없음 메시지에 표시

## Usage: master-detail 분할 레이아웃

목록-상세 분할 뷰에서 `SdBaseContainer`를 직접 사용하는 패턴:

```html
<sd-base-container
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [viewType]="viewType()"
>
  <div class="flex-row fill">
    <!-- 좌측: 목록 (control viewType) -->
    <app-my-list
      #headerSheet
      selectMode="single"
      class="flex-min bdr bdr-color-lighter"
    />

    <!-- 우측: 상세 (control viewType) -->
    @let _selectedId = headerSheet.selectedKeys().first();
    @if (_selectedId == null) {
      <div class="flex-fill tx-theme-gray-default p-xxl" style="font-size: 48px">
        <ng-icon [svg]="tablerArrowLeft" />
        선택하세요.
      </div>
    } @else {
      <app-my-detail
        class="flex-fill"
        [itemId]="_selectedId"
        (submitted)="headerSheet.doRefresh()"
      />
    }
  </div>
</sd-base-container>
```

### 소비 컴포넌트 클래스 패턴

```typescript
@Component({ /* ... */ })
export class MyView {
  perms = injectPermsSignal(["my-module"], ["use"]);
  viewType = injectViewTypeSignal();

  ready = signal(false);
  initialized = signal(true);   // 직접 데이터를 로딩하지 않으므로 즉시 true
  busyCount = signal(0);
}
```
