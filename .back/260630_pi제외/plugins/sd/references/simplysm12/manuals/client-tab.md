# 화면 내 탭 UI 사용

`<sd-tab>` 은 **현재 탭 값을 고르는 선택 컨트롤**일 뿐, 콘텐츠 컨테이너가 아니다. 탭바는 어떤 값이 선택됐는지만 양방향 바인딩으로 알려주고, 선택값에 따라 무엇을 보여줄지는 `<sd-tab>` **바깥에서** Angular 제어 흐름(`@if`)으로 직접 분기해 렌더링한다. (`sd-tab.control.ts` 의 template 은 `<ng-content>` 뿐이며, `value = model<any>()` 하나만 노출한다. `sd-tab-item.control.ts` 는 부모 `value` 와 자기 `value` 를 비교해 선택 표시만 한다.)

## 탭바를 구성하고 선택값을 바인딩하려면

`<sd-tab>` 에 `[(value)]` 로 시그널을 양방향 바인딩하고, 각 탭을 `<sd-tab-item value="...">` 로 나열한다. 탭 라벨 텍스트는 `<sd-tab-item>` 의 콘텐츠로 넣는다. 컴포넌트 `imports` 에 `SdTabControl`, `SdTabItemControl` 을 명시한다(둘 다 `@simplysm/sd-angular`).

선택값 시그널은 **literal union** 으로 타입을 좁혀 오타·리네이밍 안전성을 확보하고, 초기값은 반드시 자식 `<sd-tab-item>` 중 하나의 `value` 와 일치시킨다. 어느 항목과도 일치하지 않으면 모든 탭이 미선택 상태로 시작한다.

```ts
import { SdTabControl, SdTabItemControl } from "@simplysm/sd-angular";
// @Component({ ..., imports: [SdTabControl, SdTabItemControl, ...] })

selectedTab = $signal<"할일" | "메뉴">("할일");
```

```html
<sd-tab [(value)]="selectedTab">
  <sd-tab-item value="할일">할일목록</sd-tab-item>
  <sd-tab-item value="메뉴">메뉴표</sd-tab-item>
</sd-tab>
```

(근거: simplysm-ts `client-admin/.../task/task/TaskPage.ts` — `selectedTab = $signal<"할일" | "메뉴">("할일")` 선언과 `<sd-tab [(value)]="selectedTab">` + `<sd-tab-item value="할일">` 구성.)

## 선택된 탭에 따라 내용을 분기하려면

콘텐츠는 `<sd-tab>` 안이 아니라 그 **바깥**에서 `selectedTab()` 값을 `@if` 로 비교해 렌더링한다. 탭바는 상단에 두고 본문은 `flex-fill` 영역에서 분기하는 구조가 표준이다.

```html
<div class="flex-fill flex-column">
  <sd-tab [(value)]="selectedTab">
    <sd-tab-item value="할일">할일목록</sd-tab-item>
    <sd-tab-item value="메뉴">메뉴표</sd-tab-item>
  </sd-tab>

  @if (selectedTab() === "할일") {
    <app-task-item-sheet class="flex-fill" [itemId]="_selected.id" />
  } @else {
    <app-task-menu-table class="flex-fill" [itemId]="_selected.id" />
  }
</div>
```

(근거: 같은 `TaskPage.ts` 에서 `@if (selectedTab() === "할일")` 분기로 `<app-task-item-sheet>` / `<app-task-menu-table>` 를 교체.)

탭 항목 수가 고정이 아니라 데이터에서 동적으로 결정되면 `@for` 로 탭을 펼친다. 이때 선택값 시그널 초기값을 미리 지정할 수 없으므로, 탭 목록이 정해지는 시점에 `$effect` 로 첫 항목을 선택해 준다.

```ts
items = $signal<TFlatItem[]>([]);

modelTabs = $computed(() =>
  this.items()
    .map((item) => item.model)
    .distinct()
    .orderBy(),
);
selectedModelTab = $signal<string>();

displayItems = $computed(() =>
  this.items().filter((item) => item.model === this.selectedModelTab()),
);

constructor() {
  $effect([this.modelTabs], () => {
    this.selectedModelTab.set(this.modelTabs().first());
  });
}
```

```html
<sd-tab [(value)]="selectedModelTab">
  @for (modelTab of modelTabs(); track modelTab) {
    <sd-tab-item [value]="modelTab">{{ modelTab }}</sd-tab-item>
  }
</sd-tab>
```

(근거: centurymes `client-admin/.../inventory/model-production-inventory/ModelProductionInventoryPage.ts` — `modelTabs` 를 `@for` 로 펼치고, `$effect([this.modelTabs], ...)` 로 `selectedModelTab` 첫 항목 자동 선택, `displayItems` 가 `selectedModelTab()` 로 필터링.)

## 탭 라벨에 카운트를 표시하려면

라벨은 `<sd-tab-item>` 의 콘텐츠이므로 보간식을 그대로 넣을 수 있다. 카운트가 0 이면 숨기고 1 이상일 때만 괄호로 붙이는 식으로 조건부 표기한다.

```html
<sd-tab [(value)]="selectedTab">
  <sd-tab-item value="할일">
    할일목록{{ _selected.itemCount > 0 ? "(" + _selected.itemCount + ")" : "" }}
  </sd-tab-item>
  <sd-tab-item value="메뉴">
    메뉴표{{ _selected.menuCount > 0 ? "(" + _selected.menuCount + ")" : "" }}
  </sd-tab-item>
</sd-tab>
```

(근거: `TaskPage.ts` 의 `할일목록{{ _selected.itemCount > 0 ? "(" + _selected.itemCount + ")" : "" }}`.)

## 탭 전환 시점에 부가 동작을 실행하려면

선택값은 `model()` 기반이라 양방향 바인딩과 별개로 `(valueChange)` 출력을 함께 받을 수 있다. 탭이 바뀔 때 마지막 선택 탭을 사용자별로 저장해 두었다가 다음에 복원하는 식으로 쓴다.

```html
<sd-tab [(value)]="selectedTab" (valueChange)="onTabChange(_selected.id, $event)">
  ...
</sd-tab>
```

```ts
async onTabChange(id: number, tab: "할일" | "메뉴") {
  await this.#sdSystemConfig.setAsync(`sd-task-selected-tab.${id}`, tab);
}
```

복원은 선택 항목이 바뀌는 시점에 저장값을 읽어 `selectedTab.set(...)` 한다.

```ts
constructor() {
  $effect(async () => {
    const selectedItem = this.headerSheet()?.selectedItems().first();
    if (selectedItem) {
      this.selectedTab.set(
        (await this.#sdSystemConfig.getAsync(`sd-task-selected-tab.${selectedItem.id}`)) ?? "할일",
      );
    }
  });
}
```

(근거: `TaskPage.ts` 의 `(valueChange)="onTabChange(...)"` + `onTabChange` 가 `SdSystemConfigProvider.setAsync` 로 저장, `$effect` 에서 `getAsync` 로 복원.)

## 지킬 것

- `<sd-tab>` 은 선택 컨트롤이다. 콘텐츠를 `<sd-tab>` 안에 넣지 말고 바깥에서 `@if (selectedTab() === ...)` 로 분기한다.
- 선택값 시그널은 literal union 으로 타입을 좁히고(`$signal<"할일" | "메뉴">("할일")`), 초기값을 자식 `<sd-tab-item>` 의 `value` 중 하나와 일치시킨다. 일치하는 항목이 없으면 전부 미선택으로 시작한다.
- 탭을 `@for` 로 동적 생성할 때는 초기값을 정적으로 줄 수 없으므로 `$effect` 로 첫 항목을 선택해 미선택 시작을 막는다.
- 라벨 보간식의 카운트는 `> 0` 일 때만 노출하는 조건부 표기를 쓴다.
- 컴포넌트 `imports` 에 `SdTabControl`, `SdTabItemControl`(`@simplysm/sd-angular`)을 명시한다.

> 트리뷰처럼 콘텐츠 영역까지 컨트롤이 직접 담당하는 탭이 필요하면 `<sd-tabview>` / `<sd-tabview-item>` 을 쓴다(예: centurymes `LotTrackingPage.ts` 의 역추적/정추적). 본 매뉴얼이 다루는 `<sd-tab>` 과는 별개 컨트롤이며, 본문 분기를 직접 제어하려면 `<sd-tab>` 을 쓴다.
