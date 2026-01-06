// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadBlob } from "../../src/utils/blob";

describe("blob", () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let mockLink: HTMLAnchorElement;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // URL 메서드 모킹
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    // document.createElement 모킹
    clickSpy = vi.fn();
    mockLink = {
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe("downloadBlob", () => {
    it("Blob을 다운로드 링크로 변환하여 클릭", () => {
      const blob = new Blob(["test content"], { type: "text/plain" });
      const fileName = "test.txt";

      downloadBlob(blob, fileName);

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe("blob:mock-url");
      expect(mockLink.download).toBe(fileName);
      expect(clickSpy).toHaveBeenCalled();
    });

    it("다운로드 후 URL.revokeObjectURL 호출 (메모리 누수 방지)", () => {
      const blob = new Blob(["test"], { type: "text/plain" });

      downloadBlob(blob, "test.txt");

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("에러 발생 시에도 revokeObjectURL 호출", () => {
      const blob = new Blob(["test"], { type: "text/plain" });
      clickSpy.mockImplementation(() => {
        throw new Error("Click failed");
      });

      expect(() => downloadBlob(blob, "test.txt")).toThrow("Click failed");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });
});
