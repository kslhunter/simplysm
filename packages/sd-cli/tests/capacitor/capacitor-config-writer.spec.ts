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

  it("plugins: true인 플러그인은 옵션 없이 등록한다", async () => {
    const { writeCapacitorConfig } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await writeCapacitorConfig(CAP_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: { "@capacitor/camera": true },
    });

    const [, content] = mockFsxWrite.mock.calls[0] as [string, string];
    // plugins: true이면 옵션 객체가 생성되지 않으므로 plugins: {}
    expect(content).toContain("plugins: {}");
  });

  it("kebab-case 플러그인 이름을 PascalCase로 변환한다", async () => {
    const { writeCapacitorConfig } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await writeCapacitorConfig(CAP_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: {
        "@simplysm/capacitor-plugin-auto-update": { url: "https://example.com" },
      },
    });

    const [, content] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(content).toContain("CapacitorPluginAutoUpdate");
  });

  it("server 블록에 androidScheme과 cleartext를 포함한다", async () => {
    const { writeCapacitorConfig } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await writeCapacitorConfig(CAP_PATH, {
      appId: "com.test.app",
      appName: "Test App",
    });

    const [, content] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(content).toContain('androidScheme: "http"');
    expect(content).toContain("cleartext: true");
  });
});

describe("updateServerUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("url 필드도 server 블록도 없으면 내용을 변경하지 않는다", async () => {
    const originalContent = `const config = { appId: "test" };`;
    mockFsxRead.mockResolvedValue(originalContent);

    const { updateServerUrl } = await import(
      "../../src/capacitor/capacitor-config-writer.js"
    );

    await updateServerUrl(CAP_PATH, "http://localhost:4200");

    const [, writtenContent] = mockFsxWrite.mock.calls[0] as [string, string];
    expect(writtenContent).toBe(originalContent);
  });
});
