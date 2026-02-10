import { describe, expect, it } from "vitest";
import { html, js, mysql, pgsql, ts, tsql } from "../../src/index.js";

describe("template-strings", () => {
  describe("기본 동작", () => {
    it("문자열 조합", () => {
      const name = "test";
      expect(js`const x = "${name}"`).toBe('const x = "test"');
    });

    it("들여쓰기 제거", () => {
      const result = js`
        const x = 1;
        const y = 2;
      `;
      expect(result).toBe("const x = 1;\nconst y = 2;");
    });

    it("첫/마지막 빈 줄 제거", () => {
      const result = html`
        <div>test</div>
      `;
      expect(result).toBe("<div>test</div>");
    });

    it("중간 빈 줄 유지", () => {
      const result = js`
        const x = 1;

        const y = 2;
      `;
      expect(result).toBe("const x = 1;\n\nconst y = 2;");
    });
  });

  describe("SQL 함수들", () => {
    it("tsql", () => {
      expect(tsql`SELECT * FROM [User]`).toBe("SELECT * FROM [User]");
    });

    it("mysql", () => {
      expect(mysql`SELECT * FROM \`User\``).toBe("SELECT * FROM `User`");
    });

    it("pgsql", () => {
      expect(pgsql`SELECT * FROM "User"`).toBe('SELECT * FROM "User"');
    });

    it("tsql 멀티라인", () => {
      const result = tsql`
        SELECT id, name
        FROM [User]
        WHERE id = 1
      `;
      expect(result).toBe("SELECT id, name\nFROM [User]\nWHERE id = 1");
    });
  });

  describe("코드 함수들", () => {
    it("js", () => {
      expect(js`console.log("hello")`).toBe('console.log("hello")');
    });

    it("ts", () => {
      expect(ts`const x: number = 1`).toBe("const x: number = 1");
    });

    it("html", () => {
      expect(html`
        <div class="test">content</div>
      `).toBe('<div class="test">content</div>');
    });
  });

  describe("값 보간", () => {
    it("undefined 값 처리", () => {
      const value = undefined;
      expect(js`x = ${value}`).toBe("x = ");
    });

    it("숫자 값 처리", () => {
      expect(js`x = ${42}`).toBe("x = 42");
    });

    it("여러 값 보간", () => {
      const a = 1;
      const b = 2;
      expect(js`${a} + ${b} = ${a + b}`).toBe("1 + 2 = 3");
    });

    it("객체 값 처리", () => {
      const obj = { toString: () => "custom" };
      expect(js`value = ${obj}`).toBe("value = custom");
    });
  });
});
