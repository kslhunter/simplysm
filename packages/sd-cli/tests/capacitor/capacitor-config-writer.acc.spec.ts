import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxRead = vi.fn();

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const original = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...original,
    fsx: {
      write: mockFsxWrite,
      read: mockFsxRead,
    },
  };
});

//#endregion

const CAP_PATH = "/fake/.capacitor";

describe("writeCapacitorConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("플러그인 옵션 포함 config를 생성한다", async () => {
    const { writeCapacitorConfig } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await writeCapacitorConfig(CAP_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: {
        "@simplysm/capacitor-plugin-auto-update": { updateUrl: "https://example.com" },
      },
    });

    expect(mockFsxWrite).toHaveBeenCalledOnce();
    const [writtenPath, writtenContent] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(writtenPath).toContain("capacitor.config.ts");
    expect(writtenContent).toContain('appId: "com.test.app"');
    expect(writtenContent).toContain('appName: "Test App"');
    expect(writtenContent).toContain("CapacitorPluginAutoUpdate");
    expect(writtenContent).toContain("updateUrl");
  });

  it("플러그인 없는 config를 생성한다", async () => {
    const { writeCapacitorConfig } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await writeCapacitorConfig(CAP_PATH, {
      appId: "com.test.app",
      appName: "Test App",
    });

    const [, writtenContent] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(writtenContent).toContain("plugins: {}");
  });
});

describe("updateServerUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기존 url을 교체한다", async () => {
    mockFsxRead.mockResolvedValue(
      `const config = {
  server: {
    url: "http://old-url:3000",
  },
};`,
    );

    const { updateServerUrl } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await updateServerUrl(CAP_PATH, "http://localhost:4200");

    const [, writtenContent] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(writtenContent).toContain('url: "http://localhost:4200"');
    expect(writtenContent).not.toContain("http://old-url:3000");
  });

  it("server 블록에 url을 삽입한다", async () => {
    mockFsxRead.mockResolvedValue(
      `const config = {
  server: {
    hostname: "localhost",
  },
};`,
    );

    const { updateServerUrl } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await updateServerUrl(CAP_PATH, "http://localhost:4200");

    const [, writtenContent] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(writtenContent).toContain('url: "http://localhost:4200"');
  });
});
