# `SdTextarea`

> **읽어야 하는 상황**: 여러 줄 텍스트를 입력받을 때. 한 줄 입력은 [`SdTextfield`](.$sd-textfield.md), 리치 텍스트는 [`SdTiptapEditor`](../features$sd-tiptap-editor.md) 참조.

멀티라인 텍스트 입력 컴포넌트. 내용에 따라 행 수가 자동으로 늘어난다.

```typescript
@Component({ selector: "sd-textarea", ... })
export class SdTextarea
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `string \| undefined` | 입력 값 |
| `placeholder` | input | `string \| undefined` | 플레이스홀더 텍스트 |
| `title` | input | `string \| undefined` | 툴팁 |
| `minRows` | input | `number` | 최소 행 수 (기본값: `1`) |
| `disabled` | input | `boolean` | 비활성화 (기본값: `false`) |
| `readonly` | input | `boolean` | 읽기 전용 (기본값: `false`) |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |
| `inline` | input | `boolean` | 인라인 표시 (기본값: `false`) |
| `inset` | input | `boolean` | 인셋 스타일 (기본값: `false`) |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |
| `validatorFn` | input | `(value: string \| undefined) => string \| undefined` | 커스텀 유효성 검사 함수 |
| `theme` | input | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray" \| undefined` | 배경 테마 |
| `inputStyle` | input | `string \| undefined` | 인라인 스타일 |
| `inputClass` | input | `string \| undefined` | 추가 CSS 클래스 |

## Usage

```html
<sd-textarea [(value)]="description" [placeholder]="'설명을 입력하세요'" [minRows]="3" />
```
