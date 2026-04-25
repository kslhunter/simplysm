# `SdTab`

> **읽어야 하는 상황**: 탭으로 콘텐츠를 전환할 때.

탭 컨테이너 컴포넌트. 선택된 값을 `value` model로 보관한다.

```typescript
@Component({ selector: "sd-tab" })
class SdTab<T> {
  value = model<T>();
}
```

> **CRITICAL — 역할 범위**
> `sd-tab`/`sd-tab-item`은 **상단의 탭 선택 UI만** 담당한다. 내부 뷰(패널) 전환 기능은 **없다**.
> `sd-tab-item`의 `<ng-content>`는 **탭 라벨 전용**이다. 이 안에 시트/폼/상세 등 뷰 콘텐츠를 넣지 않는다.
> 뷰 콘텐츠는 `sd-tab` **바깥**에서 선택된 `value`를 기준으로 `@if` / `@switch`로 제어한다.

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `T \| undefined` | 선택된 탭 값 (two-way) |

## Related Types

### `SdTabItem`

탭 항목 컴포넌트. 자신의 `value`가 부모 `SdTab.value`와 같으면 선택 상태가 된다.

```typescript
@Component({ selector: "sd-tab-item" })
class SdTabItem<T> {
  value = input.required<T>();
}
```

## Usage

```html
<!-- ✅ 올바른 사용: 탭은 선택 UI, 뷰는 @if로 제어 -->
<sd-tab [(value)]="tab">
  <sd-tab-item [value]="'list'">목록<$sd-tab-item>
  <sd-tab-item [value]="'detail'">상세<$sd-tab-item>
<$sd-tab>

@if (tab() === "list") {
  <sd-sheet ...><$sd-sheet>
}
@if (tab() === "detail") {
  <app-detail ...></app-detail>
}
```
