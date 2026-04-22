# `SdShowEffect`

뷰포트에 진입할 때 reveal 애니메이션을 적용하는 디렉티브. IntersectionObserver 사용.

```typescript
@Directive({ selector: "[sdShowEffect]" })
class SdShowEffect {
  enabled = input.required({ alias: "sdShowEffect", transform: booleanAttribute });
  sdShowEffectType = input<"l2r" | "t2b">("t2b");
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `enabled` (`sdShowEffect`) | input (required) | `boolean` | - | 효과 활성화 여부 |
| `sdShowEffectType` | input | `"l2r" \| "t2b"` | `"t2b"` | 애니메이션 방향 (좌→우 / 위→아래) |
