# 탭 컨트롤 사용법

`<sd-tab>` 은 **선택기**. 콘텐츠 컨테이너가 아님. 콘텐츠는 탭 바깥에서 `@if` / `@switch` 로 분기 렌더함.

## API

| 컨트롤          | 입력                | 비고                                  |
| --------------- | ------------------- | ------------------------------------- |
| `<sd-tab>`      | `[(value)]` (model) | 현재 선택값. 양방향 필수.             |
| `<sd-tab-item>` | `[value]` (input)   | 이 항목의 식별값. 클릭 시 부모로 set. |

선택 상태는 `sd-tab-item` 이 부모 `sd-tab` 의 `value` 와 자기 `value` 를 비교해 자동 결정함.

## 표준 패턴

탭은 **상단 고정 + 본문 fill** 구조. flex-column 으로 탭바를 상단 고정, 본문은 `flex-fill` 안에 `@if` 분기.

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
- 초기값은 반드시 `<sd-tab-item>` 중 하나의 `value` 와 일치 (안 맞으면 모두 미선택 상태로 시작).
