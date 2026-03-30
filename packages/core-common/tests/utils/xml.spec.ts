import { describe, it, expect } from "vitest";
import { xml } from "@simplysm/core-common";

describe("XmlConvert", () => {
  //#region parse

  describe("parse()", () => {
    it("기본 XML 파싱", () => {
      const xmlStr = "<root><child>value</child></root>";
      const result = xml.parse(xmlStr) as Record<string, unknown>;

      expect(result).toHaveProperty("root");
    });

    it("속성이 있는 XML 파싱", () => {
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

    it("중첩 XML 파싱", () => {
      const xmlStr = "<root><parent><child>value</child></parent></root>";
      const result = xml.parse(xmlStr) as {
        root: { parent: Array<{ child: string[] }> };
      };

      expect(result.root.parent[0].child[0]).toBe("value");
    });

    it("텍스트 노드를 _ 키로 파싱", () => {
      const xmlStr = '<item id="1">text content</item>';
      const result = xml.parse(xmlStr) as {
        item: { $: { id: string }; _: string };
      };

      expect(result.item._).toBe("text content");
    });

    it("네임스페이스 접두사 제거 (stripTagPrefix: true)", () => {
      const xmlStr = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = xml.parse(xmlStr, { stripTagPrefix: true }) as {
        root: { child: string[] };
      };

      expect(result).toHaveProperty("root");
      expect(result.root).toHaveProperty("child");
    });

    it("네임스페이스 접두사 유지 (기본값)", () => {
      const xmlStr = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = xml.parse(xmlStr) as Record<string, unknown>;

      expect(result).toHaveProperty("ns:root");
    });

    it("같은 태그 복수 개를 배열로 파싱", () => {
      const xmlStr = "<root><item>1</item><item>2</item><item>3</item></root>";
      const result = xml.parse(xmlStr) as { root: { item: string[] } };

      expect(result.root.item).toEqual(["1", "2", "3"]);
    });

    it("속성에서 네임스페이스 접두사를 제거하지 않음", () => {
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
    it("객체를 XML로 직렬화", () => {
      const obj = { root: { child: "value" } };
      const result = xml.stringify(obj);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });

    it("속성이 있는 객체 직렬화", () => {
      const obj = { root: { $: { id: "1" }, child: "value" } };
      const result = xml.stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("<child>value</child>");
    });

    it("배열을 복수 태그로 직렬화", () => {
      const obj = { root: { item: ["1", "2", "3"] } };
      const result = xml.stringify(obj);

      expect(result).toContain("<item>1</item>");
      expect(result).toContain("<item>2</item>");
      expect(result).toContain("<item>3</item>");
    });

    it("텍스트 노드를 _ 키로 직렬화", () => {
      const obj = { item: { $: { id: "1" }, _: "text content" } };
      const result = xml.stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("text content");
    });

    it("중첩 객체 직렬화", () => {
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
    it("parse 후 stringify 시 구조 유지", () => {
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
