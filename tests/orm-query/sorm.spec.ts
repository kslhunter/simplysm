import * as assert from "assert";
import {describe, it} from "mocha";
import {sorm} from "@simplism/orm-query";

describe("QueryBuilder", () => {
  it("search", () => {
    const unit = sorm.search(["aaa"], "bbb ccc") as any;
    assert.strictEqual(unit.queryForWhere, "(('aaa' LIKE '%' + 'bbb' + '%') OR ('aaa' LIKE '%' + 'ccc' + '%'))");
  });
});