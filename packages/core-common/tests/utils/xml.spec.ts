import { describe, it, expect } from "vitest";
import { xmlParse as parse, xmlStringify as stringify } from "@simplysm/core-common";

describe("XmlConvert", () => {
  //#region parse

  describe("parse()", () => {
    it("Parses basic XML", () => {
      const xml = "<root><child>value</child></root>";
      const result = parse(xml) as Record<string, unknown>;

      expect(result).toHaveProperty("root");
    });

    it("Parses XML with attributes", () => {
      const xml = '<root id="1"><child name="test">value</child></root>';
      const result = parse(xml) as {
        root: {
          $: { id: string };
          child: Array<{ $: { name: string }; _: string }>;
        };
      };

      expect(result.root.$.id).toBe("1");
      expect(result.root.child[0].$.name).toBe("test");
    });

    it("Parses nested XML", () => {
      const xml = "<root><parent><child>value</child></parent></root>";
      const result = parse(xml) as {
        root: { parent: Array<{ child: string[] }> };
      };

      expect(result.root.parent[0].child[0]).toBe("value");
    });

    it("Parses text nodes as _ key", () => {
      const xml = '<item id="1">text content</item>';
      const result = parse(xml) as {
        item: { $: { id: string }; _: string };
      };

      expect(result.item._).toBe("text content");
    });

    it("Removes namespace prefix (stripTagPrefix: true)", () => {
      const xml = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = parse(xml, { stripTagPrefix: true }) as {
        root: { child: string[] };
      };

      expect(result).toHaveProperty("root");
      expect(result.root).toHaveProperty("child");
    });

    it("Preserves namespace prefix (default)", () => {
      const xml = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = parse(xml) as Record<string, unknown>;

      expect(result).toHaveProperty("ns:root");
    });

    it("Parses multiple same tags as array", () => {
      const xml = "<root><item>1</item><item>2</item><item>3</item></root>";
      const result = parse(xml) as { root: { item: string[] } };

      expect(result.root.item).toEqual(["1", "2", "3"]);
    });

    it("Does not remove namespace prefix from attributes", () => {
      const xml = '<ns:root xmlns:ns="http://example.com"><ns:child>value</ns:child></ns:root>';
      const result = parse(xml, { stripTagPrefix: true }) as {
        root: { $: Record<string, string>; child: string[] };
      };

      expect(result.root.$).toHaveProperty("xmlns:ns");
    });
  });

  //#endregion

  //#region stringify

  describe("stringify()", () => {
    it("Serializes object to XML", () => {
      const obj = { root: { child: "value" } };
      const result = stringify(obj);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });

    it("Serializes object with attributes", () => {
      const obj = { root: { $: { id: "1" }, child: "value" } };
      const result = stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("<child>value</child>");
    });

    it("Serializes array as multiple tags", () => {
      const obj = { root: { item: ["1", "2", "3"] } };
      const result = stringify(obj);

      expect(result).toContain("<item>1</item>");
      expect(result).toContain("<item>2</item>");
      expect(result).toContain("<item>3</item>");
    });

    it("Serializes text node as _ key", () => {
      const obj = { item: { $: { id: "1" }, _: "text content" } };
      const result = stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("text content");
    });

    it("Serializes nested object", () => {
      const obj = { root: { parent: { child: "value" } } };
      const result = stringify(obj);

      expect(result).toContain("<parent>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</parent>");
    });
  });

  //#endregion

  //#region roundtrip

  describe("parse/stringify roundtrip", () => {
    it("Structure preserved after parse then stringify", () => {
      const xml = "<root><child>value</child></root>";
      const parsed = parse(xml);
      const result = stringify(parsed);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });
  });

  //#endregion
});
