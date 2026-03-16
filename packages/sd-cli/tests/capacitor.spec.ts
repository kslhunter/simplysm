import { describe, expect, it, vi } from "vitest";

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    readJson: vi.fn().mockResolvedValue({ name: "test", version: "1.0.0" }),
  },
}));

vi.mock("consola", () => {
  const withTag = () => ({ debug: vi.fn(), warn: vi.fn() });
  const consola = { withTag };
  return { default: consola, consola };
});

vi.mock("sharp", () => ({ default: vi.fn() }));
vi.mock("execa", () => ({ execa: vi.fn() }));

import { Capacitor } from "../src/capacitor/capacitor";

describe("Capacitor appName validation", () => {
  const createConfig = (appName: string) => ({
    appId: "com.test.app",
    appName,
  });

  it("한글 포함 앱 이름을 허용해야 한다", async () => {
    await expect(
      Capacitor.create("/tmp", createConfig("AD-TEK 기업솔루션")),
    ).resolves.toBeDefined();
  });

  it("ASCII 앱 이름을 허용해야 한다", async () => {
    await expect(
      Capacitor.create("/tmp", createConfig("My App-1")),
    ).resolves.toBeDefined();
  });

  it("파일명 위험 특수문자를 거부해야 한다", async () => {
    await expect(
      Capacitor.create("/tmp", createConfig("App<script>")),
    ).rejects.toThrow("invalid characters");
  });

  it("빈 문자열을 거부해야 한다", async () => {
    await expect(
      Capacitor.create("/tmp", createConfig("")),
    ).rejects.toThrow("appName is required");
  });
});
