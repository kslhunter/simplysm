# Core - Pipes

## FormatPipe

**Type:** `@Pipe` | **Name:** `format`

Formats values for display in templates. Supports `DateTime`, `DateOnly`, and pattern-based string formatting.

```typescript
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `string \| DateTime \| DateOnly \| undefined` | The value to format |
| `format` | `string` | Format pattern |

### Format Patterns

**For `DateTime` / `DateOnly`:** Uses the object's `toFormatString(format)` method.

**For strings:** Uses `X` as a placeholder for each character. Multiple patterns can be separated by `|` for different lengths.

### Usage

```html
<!-- DateTime formatting -->
{{ myDate | format:'yyyy-MM-dd' }}

<!-- String pattern formatting (e.g., phone number) -->
{{ phoneNumber | format:'XXX-XXXX-XXXX|XX-XXXX-XXXX' }}

<!-- Business registration number -->
{{ bizNo | format:'XXX-XX-XXXXX' }}
```

### Return Values

- Returns `""` when value is `null` or `undefined`
- Returns the original string if no pattern matches the length
