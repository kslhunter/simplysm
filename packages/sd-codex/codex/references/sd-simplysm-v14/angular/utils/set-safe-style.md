# `setSafeStyle`

> **읽어야 하는 상황**: Renderer2로 여러 CSS 스타일을 안전하게 일괄 적용할 때.

Renderer2를 사용하여 여러 CSS 스타일을 일괄 적용한다.

```typescript
function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `renderer` | `Renderer2` | Angular Renderer2 인스턴스 |
| `el` | `HTMLElement` | 스타일 적용 대상 요소 |
| `style` | `Partial<CSSStyleDeclaration>` | 적용할 CSS 스타일 객체 |
