import { beforeEach, describe, expect, it } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdAngularConfigProvider } from "../../../src/core/providers/sd-angular-config.provider";
import { SdLocalStorageProvider } from "../../../src/core/providers/sd-local-storage.provider";

describe("Feature 1.9 Slice 1: 파일 다이얼로그 + 로컬 스토리지", () => {
  describe("Rule: 로컬 스토리지로 타입 안전하게 데이터를 저장/조회한다", () => {
    let provider: SdLocalStorageProvider<{ theme: { dark: boolean }; lang: string }>;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      const config = TestBed.inject(SdAngularConfigProvider);
      config.clientName = "test-app";

      provider = TestBed.inject(SdLocalStorageProvider);
      localStorage.clear();
    });

    it("set()으로 값을 저장하면 clientName.key로 JSON 직렬화되어 localStorage에 저장된다", () => {
      provider.set("theme", { dark: true });

      const stored = localStorage.getItem("test-app.theme");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual({ dark: true });
    });

    it("get()으로 저장된 값을 조회하면 JSON 역직렬화된 타입 안전 객체가 반환된다", () => {
      localStorage.setItem("test-app.lang", JSON.stringify("ko"));

      const result = provider.get("lang");
      expect(result).toBe("ko");
    });

    it("존재하지 않는 키를 get()하면 undefined가 반환된다", () => {
      const result = provider.get("theme");
      expect(result).toBeUndefined();
    });

    it("remove()로 값을 삭제하면 localStorage에서 해당 항목이 제거된다", () => {
      localStorage.setItem("test-app.theme", JSON.stringify({ dark: false }));

      provider.remove("theme");

      expect(localStorage.getItem("test-app.theme")).toBeNull();
    });

    it("손상된 JSON이 저장된 경우 get()은 SyntaxError 대신 undefined를 반환한다", () => {
      localStorage.setItem("test-app.theme", "{broken");

      const result = provider.get("theme");
      expect(result).toBeUndefined();
    });
  });
});
