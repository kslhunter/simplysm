import { beforeEach, describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "../../../src/core/providers/sd-navigate-window.provider";
import { SdRouterLinkDirective } from "../../../src/core/directives/sd-router-link.directive";

describe("Feature 1.7 Slice 2: 라우터 연동", () => {
  describe("Rule: SdRouterLinkDirective가 키 조합에 따라 라우팅 모드를 분기한다", () => {
    let directive: SdRouterLinkDirective;
    let mockRouter: { navigate: ReturnType<typeof vi.fn> };
    let mockNavWindow: { isWindow: boolean; open: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
      mockNavWindow = { isWindow: false, open: vi.fn() };

      TestBed.configureTestingModule({
        providers: [
          { provide: Router, useValue: mockRouter },
          { provide: SdNavigateWindowProvider, useValue: mockNavWindow },
        ],
      });

      TestBed.runInInjectionContext(() => {
        directive = new SdRouterLinkDirective();
      });
    });

    it("option이 undefined이면 아무 동작 안 함", async () => {
      await directive.onClick(new MouseEvent("click"));
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockNavWindow.open).not.toHaveBeenCalled();
    });

    it("현재 페이지가 팝업 창이면 항상 새 창으로 열기", async () => {
      mockNavWindow.isWindow = true;
      (directive as any).option = () => ({
        link: "/test",
        window: { width: 800, height: 600 },
      });

      await directive.onClick(new MouseEvent("click"));
      expect(mockNavWindow.open).toHaveBeenCalledTimes(1);
      expect(mockNavWindow.open).toHaveBeenCalledWith(
        "/test",
        undefined,
        "width=800,height=600",
      );
    });

    it("Ctrl + 클릭으로 새 탭 열기", async () => {
      (directive as any).option = () => ({
        link: "/test",
      });

      await directive.onClick(new MouseEvent("click", { ctrlKey: true }));
      expect(mockNavWindow.open).toHaveBeenCalledWith("/test", undefined, "_blank");
    });

    it("Alt + 클릭으로 새 탭 열기", async () => {
      (directive as any).option = () => ({
        link: "/test",
      });

      await directive.onClick(new MouseEvent("click", { altKey: true }));
      expect(mockNavWindow.open).toHaveBeenCalledWith("/test", undefined, "_blank");
    });

    it("Shift + 클릭으로 새 창 열기", async () => {
      (directive as any).option = () => ({
        link: "/test",
        window: { width: 1024, height: 768 },
      });

      await directive.onClick(new MouseEvent("click", { shiftKey: true }));
      expect(mockNavWindow.open).toHaveBeenCalledWith(
        "/test",
        undefined,
        "width=1024,height=768",
      );
    });

    it("일반 클릭으로 라우터 네비게이션", async () => {
      (directive as any).option = () => ({
        link: "/test",
        params: { id: "1" },
      });

      await directive.onClick(new MouseEvent("click"));
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ["/test", { id: "1" }],
        undefined,
      );
    });

    it("outletName 지정 시 명명된 outlet으로 라우팅", async () => {
      (directive as any).option = () => ({
        link: "/detail",
        outletName: "side",
      });

      await directive.onClick(new MouseEvent("click"));
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [{ outlets: { side: "/detail" } }],
        undefined,
      );
    });

    it("queryParams 포함 시 URL에 쿼리 파라미터 추가", async () => {
      (directive as any).option = () => ({
        link: "/test",
        queryParams: { page: "1" },
      });

      await directive.onClick(new MouseEvent("click"));
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ["/test"],
        { queryParams: { page: "1" } },
      );
    });
  });
});
