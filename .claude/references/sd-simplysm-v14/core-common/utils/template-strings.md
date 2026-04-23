# Template Strings

IDE 코드 하이라이팅 지원용 태그드 템플릿 리터럴 함수. 실제 동작은 문자열 결합 + 들여쓰기 정규화(앞뒤 빈 줄 제거, 공통 들여쓰기 제거)이다.

```typescript
export function js(strings: TemplateStringsArray, ...values: unknown[]): string;
export function ts(strings: TemplateStringsArray, ...values: unknown[]): string;
export function html(strings: TemplateStringsArray, ...values: unknown[]): string;
export function tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
export function mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
export function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

직접 named import로 사용한다 (네임스페이스 아님):

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";
```

## Functions

| Function | Description |
|----------|-------------|
| `js` | JavaScript 코드 하이라이팅용 |
| `ts` | TypeScript 코드 하이라이팅용 |
| `html` | HTML 마크업 하이라이팅용 |
| `tsql` | MSSQL T-SQL 하이라이팅용 |
| `mysql` | MySQL SQL 하이라이팅용 |
| `pgsql` | PostgreSQL SQL 하이라이팅용 |

## Usage

```typescript
import { ts, tsql } from "@simplysm/core-common";

const code = ts`
  interface User {
    name: string;
    age: number;
  }
`;
// "interface User {\n  name: string;\n  age: number;\n}"

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name = ${keyword}
`;
```
