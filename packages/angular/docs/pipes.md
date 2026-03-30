# Pipes

## `FormatPipe`

Formats `DateTime`, `DateOnly`, or string values using a format pattern.

Pipe name: `format`

```typescript
@Pipe({ standalone: true, name: "format" })
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

Behavior:
- `null`/`undefined` returns `""`
- `DateTime`/`DateOnly` instances call `value.toFormatString(format)`
- Strings: the format pattern uses `X` as placeholders for characters. Multiple patterns can be separated by `|` and the one matching the value's length is used.

Usage:
```html
{{ dateValue | format: "yyyy-MM-dd" }}
{{ phoneNumber | format: "XXX-XXXX-XXXX|XX-XXX-XXXX" }}
```
