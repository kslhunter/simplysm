# Template Strings

Tagged template literals for IDE code highlighting with automatic indentation normalization.

These are directly exported (not namespaced).

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";
```

## js

```typescript
function js(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for JavaScript code. Provides syntax highlighting in supported IDEs and normalizes indentation.

---

## ts

```typescript
function ts(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for TypeScript code.

---

## html

```typescript
function html(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for HTML markup.

---

## tsql

```typescript
function tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for MSSQL T-SQL queries.

---

## mysql

```typescript
function mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for MySQL SQL queries.

---

## pgsql

```typescript
function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

Template tag for PostgreSQL SQL queries.

---

## Behavior

All template tags perform the same operations:
1. Concatenate the template strings with interpolated values.
2. Strip leading and trailing empty lines.
3. Determine the minimum indentation across all non-empty lines.
4. Remove that common indentation prefix from every line.

---

## Usage Examples

```typescript
import { js, html, tsql } from "@simplysm/core-common";

const name = "World";
const code = js`
  function hello() {
    return "${name}";
  }
`;
// "function hello() {\n  return \"World\";\n}"

const markup = html`
  <div class="container">
    <span>${name}</span>
  </div>
`;

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name LIKE '%${name}%'
`;
```
