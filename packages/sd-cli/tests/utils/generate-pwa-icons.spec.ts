import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "node:fs";

// --- Mock sharp ---

const mockSharpResize = vi.fn().mockReturnThis();
const mockSharpPng = vi.fn().mockReturnThis();
const mockSharpToFile = vi.fn().mockResolvedValue(undefined);
const mockSharp = vi.fn(() => ({
  resize: mockSharpResize,
  png: mockSharpPng,
  toFile: mockSharpToFile,
}));
vi.mock("sharp", () => ({ default: mockSharp }));

// --- Dynamic import ---

const { generatePwaIcons } = await import("../../src/utils/generate-pwa-icons");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generatePwaIcons", () => {
  // Acceptance: Scenario "기본 아이콘 자동 생성"
  it("generates 192x192 and 512x512 icons from public/icon.png", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith("icon.png")) return true;
      return false;
    });
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);

    const result = await generatePwaIcons("/packages/my-client");

    expect(mockSharp).toHaveBeenCalledWith(
      path.join("/packages/my-client", "public", "icon.png"),
    );
    expect(mockSharpResize).toHaveBeenCalledWith(192, 192);
    expect(mockSharpResize).toHaveBeenCalledWith(512, 512);
    expect(mockSharpToFile).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ]);
  });

  // Acceptance: Scenario "원본 아이콘 파일이 없을 때"
  it("returns empty array when no icon source file exists", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = await generatePwaIcons("/packages/my-client");

    expect(mockSharp).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  // Unit: prefers icon.png over icon.svg
  it("uses icon.svg when icon.png does not exist", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith("icon.svg")) return true;
      return false;
    });
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);

    const result = await generatePwaIcons("/packages/my-client");

    expect(mockSharp).toHaveBeenCalledWith(
      path.join("/packages/my-client", "public", "icon.svg"),
    );
    expect(result).toHaveLength(2);
  });

  // Unit: creates icons/ directory
  it("creates public/icons/ directory before generating", async () => {
    const mkdirSpy = vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith("icon.png")) return true;
      return false;
    });

    await generatePwaIcons("/packages/my-client");

    expect(mkdirSpy).toHaveBeenCalledWith(
      path.join("/packages/my-client", "public", "icons"),
      { recursive: true },
    );
  });
});
