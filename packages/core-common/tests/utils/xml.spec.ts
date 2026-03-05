import { describe, it, expect } from "vitest";
import { xml } from "@simplysm/core-common";

describe("XmlConvert", () => {
  //#region parse

  describe("parse()", () => {
    it("Parses basic XML", () => {
      const xmlStr = "<root><child>value</child></root>";
      const result = xml.parse(xmlStr) as Record<string, unknown>;

      expect(result).toHaveProperty("root");
    });

    it("Parses XML with attributes", () => {
      const xmlStr = '<root id="1"><child name="test">value</child></root>';
      const result = xml.parse(xmlStr) as {
        root: {
          $: { id: string };
          child: Array<{ $: { name: string }; _: string }>;
        };
      };

      expect(result.root.$.id).toBe("1");
      expect(result.root.child[0].$.name).toBe("test");
    });

    it("Parses nested XML", () => {
      const xmlStr = "<root><parent><child>value</child></parent></root>";
      const result = xml.parse(xmlStr) as {
        root: { parent: Array<{ child: string[] }> };
      };

      expect(result.root.parent[0].child[0]).toBe("value");
    });

    it("Parses text nodes as _ key", () => {
      const xmlStr = '<item id="1">text content</item>';
      const result = xml.parse(xmlStr) as {
        item: { $: { id: string }; _: string };
      };

      expect(result.item._).toBe("text content");
    });

    it("Removes namespace prefix (stripTagPrefix: true)", () => {
      const xmlStr = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = xml.parse(xmlStr, { stripTagPrefix: true }) as {
        root: { child: string[] };
      };

      expect(result).toHaveProperty("root");
      expect(result.root).toHaveProperty("child");
    });

    it("Preserves namespace prefix (default)", () => {
      const xmlStr = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = xml.parse(xmlStr) as Record<string, unknown>;

      expect(result).toHaveProperty("ns:root");
    });

    it("Parses multiple same tags as array", () => {
      const xmlStr = "<root><item>1</item><item>2</item><item>3</item></root>";
      const result = xml.parse(xmlStr) as { root: { item: string[] } };

      expect(result.root.item).toEqual(["1", "2", "3"]);
    });

    it("Does not remove namespace prefix from attributes", () => {
      const xmlStr = '<ns:root xmlns:ns="http://example.com"><ns:child>value</ns:child></ns:root>';
      const result = xml.parse(xmlStr, { stripTagPrefix: true }) as {
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
      const result = xml.stringify(obj);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });

    it("Serializes object with attributes", () => {
      const obj = { root: { $: { id: "1" }, child: "value" } };
      const result = xml.stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("<child>value</child>");
    });

    it("Serializes array as multiple tags", () => {
      const obj = { root: { item: ["1", "2", "3"] } };
      const result = xml.stringify(obj);

      expect(result).toContain("<item>1</item>");
      expect(result).toContain("<item>2</item>");
      expect(result).toContain("<item>3</item>");
    });

    it("Serializes text node as _ key", () => {
      const obj = { item: { $: { id: "1" }, _: "text content" } };
      const result = xml.stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("text content");
    });

    it("Serializes nested object", () => {
      const obj = { root: { parent: { child: "value" } } };
      const result = xml.stringify(obj);

      expect(result).toContain("<parent>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</parent>");
    });
  });

  //#endregion

  //#region roundtrip

  describe("parse/stringify roundtrip", () => {
    it("Structure preserved after parse then stringify", () => {
      const xmlStr = "<root><child>value</child></root>";
      const parsed = xml.parse(xmlStr);
      const result = xml.stringify(parsed);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });
  });

  //#endregion
});
