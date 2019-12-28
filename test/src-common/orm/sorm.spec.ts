import {expect} from "chai";
import {QueryBuilder, QueryUnit, sorm} from "@simplysm/sd-orm-common";

describe("orm.sorm", () => {
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
