import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadBlob } from "../../src/utils/download";

describe("downloadBlob", () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let mockLink: HTMLAnchorElement;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    clickSpy = vi.fn();
    mockLink = {
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("converts Blob to download link and clicks it", () => {
    const blob = new Blob(["test content"], { type: "text/plain" });
    const fileName = "test.txt";

    downloadBlob(blob, fileName);

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockLink.href).toBe("blob:mock-url");
    expect(mockLink.download).toBe(fileName);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls URL.revokeObjectURL after download to prevent memory leak", () => {
    const blob = new Blob(["test"], { type: "text/plain" });

    downloadBlob(blob, "test.txt");
    vi.runAllTimers();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("calls revokeObjectURL even when error occurs", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    clickSpy.mockImplementation(() => {
      throw new Error("Click failed");
    });

    expect(() => downloadBlob(blob, "test.txt")).toThrow("Click failed");
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
