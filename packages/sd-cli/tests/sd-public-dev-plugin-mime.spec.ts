import { describe, expect, it } from "vitest";
import { getMimeType } from "../src/utils/vite-config";

describe("getMimeType", () => {
  it("returns correct MIME for common web types", () => {
    expect(getMimeType(".html")).toBe("text/html");
    expect(getMimeType(".css")).toBe("text/css");
    expect(getMimeType(".js")).toBe("text/javascript");
    expect(getMimeType(".json")).toBe("application/json");
    expect(getMimeType(".png")).toBe("image/png");
    expect(getMimeType(".svg")).toBe("image/svg+xml");
    expect(getMimeType(".woff2")).toBe("font/woff2");
  });

  it("returns application/octet-stream for unknown extensions", () => {
    expect(getMimeType(".xyz")).toBe("application/octet-stream");
    expect(getMimeType("")).toBe("application/octet-stream");
  });
});
