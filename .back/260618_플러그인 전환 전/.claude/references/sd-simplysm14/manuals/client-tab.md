# 탭 컨트롤 사용법

`<sd-tab>` 은 **현재 탭 값을 고르는 선택 컨트롤**. 콘텐츠 컨테이너 아님. 각 탭에 대응하는 콘텐츠는 `<sd-tab>` 바깥에서 Angular 제어 흐름(`@if` / `@switch`)으로 분기 렌더링.

## API

| 컨트롤          | 입력                | 비고                                  |
| --------------- | ------------------- | ------------------------------------- |
| `<sd-tab>`      | `[(value)]` (model) | 현재 선택값. 양방향 필수.             |
| `<sd-tab-item>` | `[value]` (input)   | 이 항목의 식별값. 클릭 시 부모로 set. |

선택 상태는 `sd-tab-item` 이 부모 `sd-tab` 의 `value` 와 자기 `value` 를 비교해 자동 결정함.

## 표준 패턴

탭은 **상단 고정 + 본문 fill** 구조. 바깥 컨테이너는 `flex-column` 으로 두고, 탭바는 상단에 고정, 본문은 `flex-fill` 영역 안에서 `@if` 로 분기.

```html
<div class="flex-column fill">
  <div class="pb-default">
    <sd-tab [(value)]="activeTab">
      <sd-tab-item [value]="'info'">기본정보</sd-tab-item>
      <sd-tab-item [value]="'history'">이력</sd-tab-item>
    </sd-tab>
  </div>

  <div class="flex-fill">
    @if (activeTab() === "info") {
      <app-info-list />
    } @else {
      <app-history-list />
    }
  </div>
</div>
```

```ts
activeTab = signal<"info" | "history">("info");
```

- 시그널 타입은 **literal union** 으로 잡아 오타·리네이밍 안전성 확보.
- 초기값은 반드시 자식 `<sd-tab-item>` 중 하나의 `[value]` 와 일치하도록 설정 (어떤 항목과도 일치하지 않으면 모든 탭이 미선택 상태로 시작).
