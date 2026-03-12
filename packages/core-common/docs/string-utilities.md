# String Utilities

Imported as the `str` namespace.

```typescript
import { str } from "@simplysm/core-common";
```

## getKoreanSuffix

```typescript
function getKoreanSuffix(text: string, type: "eul" | "eun" | "i" | "wa" | "rang" | "ro" | "ra"): string;
```

Returns the appropriate Korean grammatical particle based on whether the last character has a final consonant (jongseong). Supports seven particle types.

---

## replaceFullWidth

```typescript
function replaceFullWidth(str: string): string;
```

Converts full-width characters to half-width: uppercase/lowercase letters, digits, spaces, and parentheses.

---

## Case Conversion

```typescript
function toPascalCase(str: string): string;  // "hello-world" -> "HelloWorld"
function toCamelCase(str: string): string;   // "hello-world" -> "helloWorld"
function toKebabCase(str: string): string;   // "HelloWorld" -> "hello-world"
function toSnakeCase(str: string): string;   // "HelloWorld" -> "hello_world"
```

Converts between PascalCase, camelCase, kebab-case, and snake_case. Input separators (`-`, `_`, `.`) are recognized.

---

## isNullOrEmpty

```typescript
function isNullOrEmpty(str: string | undefined): str is "" | undefined;
```

Type guard that returns `true` for `undefined`, `null`, or empty string.

---

## insert

```typescript
function insert(str: string, index: number, insertString: string): string;
```

Inserts a string at the specified position.

---

## Usage Examples

```typescript
import { str } from "@simplysm/core-common";

str.toPascalCase("hello-world");   // "HelloWorld"
str.toCamelCase("HelloWorld");     // "helloWorld"
str.toKebabCase("HelloWorld");     // "hello-world"
str.toSnakeCase("helloWorld");     // "hello_world"

str.replaceFullWidth("ABC123"); // "ABC123"

str.isNullOrEmpty("");          // true
str.isNullOrEmpty(undefined);   // true
str.isNullOrEmpty("hello");     // false

str.insert("Hello World", 5, ","); // "Hello, World"
```
