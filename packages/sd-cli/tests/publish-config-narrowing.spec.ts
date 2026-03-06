import { describe, expect, it } from "vitest";
import type { SdPublishConfig, SdNpmPublishConfig } from "../src/sd-config.types";

describe("SdPublishConfig", () => {
  it("all variants have .type field for uniform narrowing", () => {
    const configs: SdPublishConfig[] = [
      { type: "npm" },
      { type: "local-directory", path: "/deploy" },
      { type: "ftp", host: "example.com" },
    ];

    const types = configs.map((c) => c.type);
    expect(types).toEqual(["npm", "local-directory", "ftp"]);
  });

  it("npm config is an object with type field", () => {
    const npmConfig: SdNpmPublishConfig = { type: "npm" };
    expect(npmConfig.type).toBe("npm");
  });
});
