# `SdAdditionalButton`

주 콘텐츠 영역과 추가 동작 버튼을 나란히 배치하는 복합 컴포넌트. 콘텐츠 왼쪽 `_content` 영역과 오른쪽 `_button` 영역으로 구성된다.

```typescript
@Component({ selector: "sd-additional-button", ... })
export class SdAdditionalButton
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `disabled` | input | `boolean` | 비활성화 여부 (기본값: `false`) |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |
| `inset` | input | `boolean` | 인셋 스타일 여부 (기본값: `false`) |

## Usage

```html
<sd-additional-button>
  선택된 항목 이름
  <sd-anchor>편집</sd-anchor>
  <sd-button>삭제</sd-button>
</sd-additional-button>
```
