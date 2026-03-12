# XML Utilities

Imported as the `xml` namespace. XML parsing and serialization via `fast-xml-parser`.

```typescript
import { xml } from "@simplysm/core-common";
```

## parse

```typescript
function parse(str: string, options?: { stripTagPrefix?: boolean }): unknown;
```

Parses an XML string into an object. Attributes are grouped under `$`, text content under `_`, and child elements are converted to arrays (except the root). Set `stripTagPrefix` to remove namespace prefixes from tag names.

---

## stringify

```typescript
function stringify(obj: unknown, options?: XmlBuilderOptions): string;
```

Serializes an object to XML string. Accepts optional `fast-xml-parser` builder options.

---

## Usage Examples

```typescript
import { xml } from "@simplysm/core-common";

const obj = xml.parse('<root id="1"><item>hello</item><item>world</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }, { _: "world" }] } }

const xmlStr = xml.stringify({
  root: {
    $: { id: "1" },
    item: [{ _: "hello" }, { _: "world" }],
  },
});
// '<root id="1"><item>hello</item><item>world</item></root>'

// Strip namespace prefixes
xml.parse('<ns:root><ns:item>test</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "test" }] } }
```
