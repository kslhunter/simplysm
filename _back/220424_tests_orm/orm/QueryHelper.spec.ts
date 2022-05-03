import { expect } from "chai";
import { QueryHelper, QueryUnit } from "@simplysm/sd-orm-common";

describe("(common) orm.QueryHelper", () => {
  const qh = new QueryHelper("mssql");

  it("equal", () => {
    expect(
      qh.equal(new QueryUnit(String, "[TBL].[id]"), "12345")
    ).to.deep.equal(["[TBL].[id]", " = ", "N'12345'"]);
  });

  it("equal (NULL)", () => {
    expect(
      qh.equal(new QueryUnit(String, "[TBL].[id]"), undefined)
    ).to.deep.equal(["[TBL].[id]", " IS ", "NULL"]);
  });

  it("equal: 두 값이 모두 NULL 일때 같지 않음으로 떨어지는 문제 해결", () => {
    expect(
      qh.equal(new QueryUnit(String, "[TBL].[id]"), new QueryUnit(String, "[TBL].[id1]"))
    ).to.deep.equal([
      [
        ["[TBL].[id]", " IS ", "NULL"],
        " AND ",
        ["[TBL].[id1]", " IS ", "NULL"]
      ],
      " OR ",
      ["[TBL].[id]", " = ", "[TBL].[id1]"]
    ]);
  });

  it("and", () => {
    expect(
      qh.and([
        qh.equal(new QueryUnit(String, "[TBL].[id]"), "12345"),
        qh.equal(new QueryUnit(String, "[TBL].[id]"), undefined)
      ])
    ).to.deep.equal([
      ["[TBL].[id]", " = ", "N'12345'"],
      " AND ",
      ["[TBL].[id]", " IS ", "NULL"]
    ]);
  });
});
