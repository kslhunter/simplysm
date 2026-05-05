# `SdStatePreset`

> **읽어야 하는 상황**: 화면 상태(검색 조건 등)를 프리셋으로 저장/불러오기할 때.

화면 상태(검색 조건 등)를 로컬 스토리지에 저장하고 불러오는 프리셋 컴포넌트.
`SdSystemConfigProvider`를 통해 설정 키 기반으로 저장한다.

```typescript
@Component({ selector: "sd-state-preset", ... })
export class SdStatePreset
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `key` | input (required) | `string` | 저장 키 (`SdSystemConfigProvider` 기반) |
| `state` | model | `any` | 현재 상태 객체. 프리셋 클릭 시 해당 프리셋의 상태로 업데이트됨 |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |

## Related Types

### `SdStatePresetDef`

```typescript
interface SdStatePresetDef {
  name: string;
  state: any;
}
```

## Usage

```html
<sd-state-preset [key]="'order-list-search'" [(state)]="searchState" />
```

> 프리셋 아이콘 클릭 → 이름 입력 모달 → 현재 `state`를 해당 이름으로 저장.
> 저장된 프리셋 클릭 → `state`가 해당 프리셋의 값으로 업데이트됨.
