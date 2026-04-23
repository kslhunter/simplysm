# `SdNumpad`

숫자 패드 입력 컴포넌트. 버튼을 클릭하여 숫자를 입력한다.

```typescript
@Component({ selector: "sd-numpad", ... })
export class SdNumpad
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `number \| undefined` | 숫자 값 |
| `placeholder` | input | `string \| undefined` | 플레이스홀더 |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |
| `inputDisabled` | input | `boolean` | 상단 텍스트 입력 비활성화 (기본값: `false`) |
| `useEnterButton` | input | `boolean` | 확인 버튼 표시 (기본값: `false`) |
| `useMinusButton` | input | `boolean` | 부호 반전 버튼 표시 (기본값: `false`) |
| `enterButtonClick` | output | `void` | 확인 버튼 클릭 이벤트 |

## Usage

```html
<sd-numpad [(value)]="quantity" [useEnterButton]="true" (enterButtonClick)="onConfirm()" />
```
