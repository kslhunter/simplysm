# `SdTiptapEditor`

TipTap 기반 리치 텍스트 에디터 컴포넌트. 툴바를 통해 텍스트 서식(제목, 굵게, 기울임, 색상, 정렬 등)을 제어한다.

```typescript
@Component({ selector: "sd-tiptap-editor", ... })
export class SdTiptapEditor
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `value` | model | `string \| undefined` | HTML 콘텐츠 |
| `disabled` | input | `boolean` | 비활성화 — 툴바 숨김, 편집 불가 (기본값: `false`) |
| `readonly` | input | `boolean` | 읽기 전용 — 편집 불가, 툴바 표시 (기본값: `false`) |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |
| `placeholder` | input | `string \| undefined` | 플레이스홀더 텍스트 |
| `validatorFn` | input | `(value: string \| undefined) => string \| undefined` | 커스텀 유효성 검사 함수 |
| `extensions` | input | `AnyExtension[] \| undefined` | 추가 TipTap 확장 (기본 확장: StarterKit, TextStyle, Color, Highlight, TextAlign, Image, Underline, Placeholder) |

## Usage

```html
<sd-tiptap-editor [(value)]="content" [placeholder]="'내용을 입력하세요'" />
```
