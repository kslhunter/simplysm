# Pipes

## `FormatPipe`

DateTime, DateOnly, string 값을 포맷팅하는 파이프. 파이프명: `format`

```typescript
@Pipe({ name: "format" })
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

### DateTime / DateOnly

`value.toFormatString(format)`을 호출한다.

```html
{{ someDateTime | format: "yyyy-MM-dd HH:mm" }}
{{ someDateOnly | format: "yyyy년 MM월 dd일" }}
```

### String

format 문자열에서 `X` 문자를 값의 문자로 치환한다. `|`로 구분된 여러 포맷 중 길이가 일치하는 것을 사용한다.

```html
<!-- "01012345678" → "010-1234-5678" -->
{{ phone | format: "XXX-XXXX-XXXX|XX-XXX-XXXX|XX-XXXX-XXXX" }}
```

`undefined` 또는 `null` 입력 시 빈 문자열 반환.
