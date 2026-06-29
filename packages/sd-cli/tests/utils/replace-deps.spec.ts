import { describe, it, expect } from "vitest";
import { resolveReplaceDepEntries } from "../../src/deps/replace-deps/replace-deps-resolve";

describe("resolveReplaceDepEntries", () => {
  it("matches exact package names", () => {
    const results = resolveReplaceDepEntries(
      { "@simplysm/core-common": "../core-common" },
      ["@simplysm/core-common", "@simplysm/core-node"],
    );

    expect(results).toHaveLength(1);
    expect(results[0].targetName).toBe("@simplysm/core-common");
    expect(results[0].sourcePath).toBe("../core-common");
  });

  it("matches glob patterns with wildcard", () => {
    const results = resolveReplaceDepEntries(
      { "@simplysm/*": "../packages/*" },
      ["@simplysm/core-common", "@simplysm/core-node"],
    );

    expect(results).toHaveLength(2);
    expect(results[0].sourcePath).toBe("../packages/core-common");
    expect(results[1].sourcePath).toBe("../packages/core-node");
  });

  it("returns empty array when no matches", () => {
    const results = resolveReplaceDepEntries(
      { "@other/*": "../other/*" },
      ["@simplysm/core-common"],
    );

    expect(results).toHaveLength(0);
  });
});
