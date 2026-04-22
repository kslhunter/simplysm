# `SdInvalid`

호스트 요소에 유효성 검증 표시기를 추가하는 디렉티브. 빨간 점 표시기와 숨겨진 input으로 구성.

```typescript
@Directive({ selector: "[sdInvalid]" })
class SdInvalid {
  invalidMessage = input.required<string>({ alias: "sdInvalid" });
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `invalidMessage` (`sdInvalid`) | input (required) | `string` | 유효성 오류 메시지. 빈 문자열이면 유효, 비어있지 않으면 무효 |

## Usage

```html
<div [sdInvalid]="name이 비어있습니다">
  <!-- 메시지가 있으면 빨간 점 표시기 노출 -->
</div>
```
