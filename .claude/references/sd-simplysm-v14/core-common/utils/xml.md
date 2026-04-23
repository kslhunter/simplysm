# xml

XML 변환 유틸리티 네임스페이스. `fast-xml-parser` 기반.

```typescript
import { xml } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(str, options?) => unknown` | XML 문자열을 객체로 파싱 |
| `stringify` | `(obj, options?) => string` | 객체를 XML 문자열로 직렬화 |

## `parse` — 파싱 규칙

- 속성: `$` 객체에 그룹화
- 텍스트 노드: `_` key에 저장
- 자식 요소: 배열로 변환 (루트 요소 제외)

## `parse` — options

| Field | Type | Description |
|-------|------|-------------|
| `stripTagPrefix` | `boolean` | 태그 접두사(네임스페이스) 제거 여부. 속성은 접두사 유지 |

## Usage

```typescript
import { xml } from "@simplysm/core-common";

// 파싱
const result = xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

// 네임스페이스 제거
const clean = xml.parse('<ns:root><ns:item>hello</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "hello" }] } }

// 직렬화
const str = xml.stringify({
  root: {
    $: { id: "1" },
    item: [{ _: "hello" }, { _: "world" }],
  },
});
// '<root id="1"><item>hello</item><item>world</item></root>'
```
