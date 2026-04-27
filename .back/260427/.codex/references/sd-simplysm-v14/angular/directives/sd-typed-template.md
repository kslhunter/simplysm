# `SdTypedTemplate`

> **읽어야 하는 상황**: ng-template 컨텍스트의 타입을 지정하여 타입 안전한 템플릿을 작성할 때.

`ng-template`의 컨텍스트 타입을 지정하는 디렉티브. 타입 가드를 통해 템플릿 내부에서 정확한 타입을 사용할 수 있다.

```typescript
@Directive({ selector: "ng-template[typed]" })
class SdTypedTemplate<T> {
  typed = input.required<T>();

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplate<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `typed` | input (required) | `T` | 컨텍스트 타입 토큰 |

## Related Types

### `SdItemOfTemplate`

항목 반복 템플릿의 컨텍스트 타입을 지정하는 디렉티브.

```typescript
@Directive({ selector: "ng-template[itemOf]" })
class SdItemOfTemplate<TItem> {
  itemOf = input.required<TItem[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdItemOfTemplate<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdItemOfTemplateContext<TContextItem>;
}
```

### `SdItemOfTemplateContext`

```typescript
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$implicit` | `TItem` | 현재 항목 (let-item으로 접근) |
| `item` | `TItem` | 현재 항목 (명시적 접근) |
| `index` | `number` | 인덱스 |
| `depth` | `number` | 깊이 (트리 구조에서 사용) |

## Usage

```html
<ng-template [typed]="typedVar" let-item>
  <!-- item의 타입이 typeof typedVar -->
</ng-template>

<ng-template [itemOf]="items()" let-item let-index="index">
  {{ item.name }}
</ng-template>
```
