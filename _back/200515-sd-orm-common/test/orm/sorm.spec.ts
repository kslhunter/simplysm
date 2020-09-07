import {expect} from "chai";
import {QueryBuilder, QueryUnit, sorm} from "@simplysm/sd-orm-common";

describe("(common) orm.sorm", () => {
  it("equal", () => {
    expect(
      QueryBuilder.getQueryOfQueryValue(
        sorm.equal(new QueryUnit(String, "[TBL].[id]"), "12345")
      )
    ).to.equal("([TBL].[id] = N'12345')");
  });

  it("equal (NULL)", () => {
    expect(
      QueryBuilder.getQueryOfQueryValue(
        sorm.equal(new QueryUnit(String, "[TBL].[id]"), undefined)
      )
    ).to.equal("([TBL].[id] IS NULL)");
  });

  it("equal: 두 값이 모두 NULL 일때 같지 않음으로 떨어지는 문제 해결", () => {
    expect(
      QueryBuilder.getQueryOfQueryValue(
        sorm.equal(new QueryUnit(String, "[TBL].[id]"), new QueryUnit(String, "[TBL].[id1]"))
      )
    ).to.equal("((([TBL].[id] IS NULL) AND ([TBL].[id1] IS NULL)) OR ([TBL].[id] = [TBL].[id1]))");
  });

  it("and", () => {
    expect(
      QueryBuilder.getQueryOfQueryValue(
        sorm.and([
          sorm.equal(new QueryUnit(String, "[TBL].[id]"), "12345"),
          sorm.equal(new QueryUnit(String, "[TBL].[id]"), undefined)
        ])
      )
    ).to.equal("(([TBL].[id] = N'12345') AND ([TBL].[id] IS NULL))");
  });
});
