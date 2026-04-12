import { describe, it, expect } from "vitest";
import formTableCss from "../../scss/controls/_form-table.scss?inline";
import tableCss from "../../scss/controls/_table.scss?inline";

describe("Feature: 레이아웃 directive 전체 제거", () => {
  // Scenario: _form-table.scss에 display: table 추가
  it("_form-table.scss의 .form-table selector에 display: table이 있다", () => {
    expect(formTableCss).toMatch(/\.form-table\s*\{[^}]*display:\s*table/s);
  });

  // Scenario: _table.scss에 display: table 추가
  it("_table.scss의 .table selector에 display: table이 있다", () => {
    expect(tableCss).toMatch(/\.table\s*\{[^}]*display:\s*table/s);
  });

  // Unit: display: table이 다른 display 속성과 충돌하지 않는다
  it("_form-table.scss에 display 속성이 정확히 1개만 있다", () => {
    const matches = formTableCss.match(/display:\s*table/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it("_table.scss의 최상위 .table selector에 display 속성이 정확히 1개만 있다", () => {
    // .table 블록의 첫 번째 중괄호까지만 추출하여 display 속성 확인
    const topBlock = tableCss.match(/\.table\s*\{([^}]*)\}/s);
    expect(topBlock).not.toBeNull();
    const displayMatches = topBlock![1].match(/display:\s*table/g);
    expect(displayMatches).not.toBeNull();
    expect(displayMatches!.length).toBe(1);
  });
});
