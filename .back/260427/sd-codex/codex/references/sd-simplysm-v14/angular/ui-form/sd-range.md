# `SdRange`

> **읽어야 하는 상황**: 범위(from ~ to) 입력이 필요할 때.

범위 입력 컴포넌트. `from`/`to` 두 개의 `SdTextfield`를 나란히 배치한다.

```typescript
@Component({ selector: "sd-range", ... })
export class SdRange<K extends keyof SdTextfieldTypes>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `type` | input (required) | `K` | 텍스트필드 타입 (`SdTextfieldTypes`의 키) |
| `from` | model | `SdTextfieldTypes[K] \| undefined` | 시작 값 |
| `to` | model | `SdTextfieldTypes[K] \| undefined` | 종료 값 |
| `inputStyle` | input | `string \| undefined` | 인라인 스타일 |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |
| `disabled` | input | `boolean` | 비활성화 (기본값: `false`) |

## Usage

```html
<sd-range [type]="'date'" [(from)]="startDate" [(to)]="endDate" />
<sd-range [type]="'number'" [(from)]="minValue" [(to)]="maxValue" />
```
