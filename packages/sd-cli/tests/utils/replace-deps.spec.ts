import { describe, it, expect } from "vitest";
import { resolveReplaceDepEntries, parseWorkspaceGlobs } from "../../src/utils/replace-deps";

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

describe("parseWorkspaceGlobs", () => {
  it("parses packages section from workspace yaml", () => {
    const content = `packages:
  - "packages/*"
  - "tools/*"
`;
    const globs = parseWorkspaceGlobs(content);
    expect(globs).toEqual(["packages/*", "tools/*"]);
  });

  it("handles unquoted values", () => {
    const content = `packages:
  - packages/*
`;
    const globs = parseWorkspaceGlobs(content);
    expect(globs).toEqual(["packages/*"]);
  });

  it("stops at next section", () => {
    const content = `packages:
  - packages/*
other:
  - something
`;
    const globs = parseWorkspaceGlobs(content);
    expect(globs).toEqual(["packages/*"]);
  });

  it("returns empty array when no packages section", () => {
    const globs = parseWorkspaceGlobs("other:\n  - foo\n");
    expect(globs).toEqual([]);
  });
});
