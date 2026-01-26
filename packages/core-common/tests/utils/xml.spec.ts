import { describe, it, expect } from "vitest";
import { xmlParse as parse, xmlStringify as stringify } from "@simplysm/core-common";

describe("XmlConvert", () => {
  //#region parse

  describe("parse()", () => {
    it("기본 XML을 파싱한다", () => {
      const xml = "<root><child>value</child></root>";
      const result = parse(xml) as Record<string, unknown>;

      expect(result).toHaveProperty("root");
    });

    it("속성을 포함한 XML을 파싱한다", () => {
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

    it("중첩된 XML을 파싱한다", () => {
      const xml = "<root><parent><child>value</child></parent></root>";
      const result = parse(xml) as {
        root: { parent: Array<{ child: string[] }> };
      };

      expect(result.root.parent[0].child[0]).toBe("value");
    });

    it("텍스트 노드를 _ 키로 파싱한다", () => {
      const xml = '<item id="1">text content</item>';
      const result = parse(xml) as {
        item: { $: { id: string }; _: string };
      };

      expect(result.item._).toBe("text content");
    });

    it("namespace prefix를 제거한다 (stripTagPrefix: true)", () => {
      const xml = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = parse(xml, { stripTagPrefix: true }) as {
        root: { child: string[] };
      };

      expect(result).toHaveProperty("root");
      expect(result.root).toHaveProperty("child");
    });

    it("namespace prefix를 유지한다 (기본)", () => {
      const xml = "<ns:root><ns:child>value</ns:child></ns:root>";
      const result = parse(xml) as Record<string, unknown>;

      expect(result).toHaveProperty("ns:root");
    });

    it("여러 개의 같은 태그를 배열로 파싱한다", () => {
      const xml = "<root><item>1</item><item>2</item><item>3</item></root>";
      const result = parse(xml) as { root: { item: string[] } };

      expect(result.root.item).toEqual(["1", "2", "3"]);
    });

    it("속성의 namespace prefix는 제거하지 않는다", () => {
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
    it("객체를 XML로 직렬화한다", () => {
      const obj = { root: { child: "value" } };
      const result = stringify(obj);

      expect(result).toContain("<root>");
      expect(result).toContain("<child>value</child>");
      expect(result).toContain("</root>");
    });

    it("속성을 포함한 객체를 직렬화한다", () => {
      const obj = { root: { $: { id: "1" }, child: "value" } };
      const result = stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("<child>value</child>");
    });

    it("배열을 여러 태그로 직렬화한다", () => {
      const obj = { root: { item: ["1", "2", "3"] } };
      const result = stringify(obj);

      expect(result).toContain("<item>1</item>");
      expect(result).toContain("<item>2</item>");
      expect(result).toContain("<item>3</item>");
    });

    it("텍스트 노드를 _ 키로 직렬화한다", () => {
      const obj = { item: { $: { id: "1" }, _: "text content" } };
      const result = stringify(obj);

      expect(result).toContain('id="1"');
      expect(result).toContain("text content");
    });

    it("중첩된 객체를 직렬화한다", () => {
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
    it("parse 후 stringify하면 구조가 유지된다", () => {
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
