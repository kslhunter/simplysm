# `SdCollapse`

접기/펼치기 패널 컴포넌트.

```typescript
@Component({ selector: "sd-collapse" })
class SdCollapse {
  open = input(false, { transform: booleanAttribute });
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `open` | input | `boolean` | `false` | 펼침 상태 |

## Related Types

### `SdCollapseIcon`

접기/펼치기 아이콘 컴포넌트. 화살표 회전 애니메이션.

```typescript
@Component({ selector: "sd-collapse-icon" })
class SdCollapseIcon {
  open = input(false, { transform: booleanAttribute });
  openRotate = input(90, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 펼침 상태 |
| `openRotate` | `number` | `90` | 열림 시 회전 각도 |
