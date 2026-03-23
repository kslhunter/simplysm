# Template Strings

Tagged template literal functions that auto-trim indentation. All functions strip leading/trailing blank lines and remove the minimum common indentation from all lines, making it easy to write indented multi-line strings in code without extra whitespace.

Each function is semantically identical in behavior -- they differ only in name for IDE syntax highlighting and tooling purposes.

## html

Tagged template for HTML content.

```ts
function html(strings: TemplateStringsArray, ...values: any[]): string
```

## javascript

Tagged template for JavaScript content.

```ts
function javascript(strings: TemplateStringsArray, ...values: any[]): string
```

## typescript

Tagged template for TypeScript content.

```ts
function typescript(strings: TemplateStringsArray, ...values: any[]): string
```

## string

Tagged template for general string content.

```ts
function string(strings: TemplateStringsArray, ...values: any[]): string
```

## tsql

Tagged template for T-SQL content.

```ts
function tsql(strings: TemplateStringsArray, ...values: any[]): string
```

## mysql

Tagged template for MySQL content.

```ts
function mysql(strings: TemplateStringsArray, ...values: any[]): string
```

## Trimming Behavior

All functions apply the same trimming logic:

1. Split the raw string into lines.
2. Remove the first line if it is whitespace-only.
3. Remove the last line if it is whitespace-only.
4. Calculate the minimum indentation across all non-empty lines.
5. Strip that minimum indentation from every line.
6. Join lines with `\n`.

### Example

```ts
import { html } from "@simplysm/sd-core-common";

const result = html`
  <div>
    <span>Hello</span>
  </div>
`;
// result === "<div>\n  <span>Hello</span>\n</div>"
```
