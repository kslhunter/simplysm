import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { SdAppStructureProvider } from "../../../src/core/providers/sd-app-structure.provider";
import { SdToastProvider } from "../../../src/ui/overlay/toast/sd-toast.provider";
import { SdSharedDataProvider } from "../../../src/core/providers/sd-shared-data.provider";
import { DDTestHost, type TestDetailItem } from "./sd-data-detail-test.fixture";
import type { ISdDataDetailDataInfo } from "../../../src/features/data-view/sd-data-detail.control";

function createMockToast() {
  return {
    try: vi.fn(async (fn: () => Promise<any>) => fn()),
    info: vi.fn(),
    success: vi.fn(),
    danger: vi.fn(),
  };
}

function createMockSharedData() {
  return {
    wait: vi.fn().mockResolvedValue(undefined),
    loadingCount: () => 0,
  };
}

function createMockAppStructure() {
  return {
    items: [],
    usableModules: () => undefined,
    permRecord: () => undefined,
    getTitleByFullCode: vi.fn().mockReturnValue(""),
    getPermsByFullCode: vi.fn().mockReturnValue([]),
  };
}

function makeExistingInfo(overrides?: Partial<ISdDataDetailDataInfo>): ISdDataDetailDataInfo {
  return {
    isNew: false,
    isDeleted: false,
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
    ...overrides,
  };
}

function makeNewInfo(): ISdDataDetailDataInfo {
  return {
    isNew: true,
    isDeleted: false,
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };
}

let mockToast: ReturnType<typeof createMockToast>;

function setupTestBed() {
  mockToast = createMockToast();
  TestBed.configureTestingModule({
    imports: [DDTestHost],
    providers: [
      { provide: SdAppStructureProvider, useValue: createMockAppStructure() },
      { provide: Router, useValue: { events: new Subject(), url: "/app/test" } },
      { provide: SdToastProvider, useValue: mockToast },
      { provide: SdSharedDataProvider, useValue: createMockSharedData() },
    ],
  });
}

async function createFixtureAndInit(
  data: TestDetailItem = { id: 1, name: "Test" },
  info: ISdDataDetailDataInfo = makeExistingInfo(),
) {
  const fixture = TestBed.createComponent(DDTestHost);
  const host = fixture.componentInstance;
  host.loadFn.mockResolvedValue({ data, info });

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();

  return { fixture, host };
}

describe("AbsSdDataDetail", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Acceptance Tests

  describe("초기 로드", () => {
    it("권한이 있는 사용자가 화면에 진입하면 load가 호출되고 data/dataInfo가 설정된다", async () => {
      const testData: TestDetailItem = { id: 1, name: "Test Item" };
      const testInfo = makeExistingInfo();

      const { host } = await createFixtureAndInit(testData, testInfo);

      expect(host.loadFn).toHaveBeenCalled();
      expect(host.data()).toEqual(testData);
      expect(host.dataInfo()).toEqual(testInfo);
      expect(host.initialized()).toBe(true);
    });

    it("권한이 없는 사용자가 화면에 진입하면 load가 호출되지 않고 initialized만 설정된다", async () => {
      const fixture = TestBed.createComponent(DDTestHost);
      const host = fixture.componentInstance;
      host.canUse.set(false);
      host.loadFn.mockResolvedValue({
        data: { id: 1, name: "Test" },
        info: makeExistingInfo(),
      });
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.loadFn).not.toHaveBeenCalled();
      expect(host.initialized()).toBe(true);
    });
  });

  //#endregion

  //#region Unit Tests — refresh

  describe("doRefresh", () => {
    it("변경사항 없이 새로고침하면 load가 재호출된다", async () => {
      const { host } = await createFixtureAndInit();

      host.loadFn.mockClear();
      host.loadFn.mockResolvedValue({
        data: { id: 1, name: "Updated" },
        info: makeExistingInfo(),
      });

      await host.doRefresh();

      expect(host.loadFn).toHaveBeenCalled();
      expect(host.data().name).toBe("Updated");
    });

    it("busyCount > 0이면 새로고침을 무시한다", async () => {
      const { host } = await createFixtureAndInit();
      host.loadFn.mockClear();
      host.busyCount.set(1);

      await host.doRefresh();

      expect(host.loadFn).not.toHaveBeenCalled();
    });

    it("canUse가 false이면 새로고침을 무시한다", async () => {
      const { host } = await createFixtureAndInit();
      host.loadFn.mockClear();
      host.canUse.set(false);

      await host.doRefresh();

      expect(host.loadFn).not.toHaveBeenCalled();
    });

    it("변경사항이 있고 confirm을 취소하면 새로고침이 중단된다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });
      host.loadFn.mockClear();

      // 데이터 변경 (스냅샷과 다르게)
      host.data.set({ id: 1, name: "Modified" });

      vi.spyOn(globalThis, "confirm").mockReturnValue(false);

      await host.doRefresh();

      expect(host.loadFn).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("변경사항이 있고 confirm을 승인하면 새로고침이 진행된다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });
      host.loadFn.mockClear();
      host.loadFn.mockResolvedValue({
        data: { id: 1, name: "Refreshed" },
        info: makeExistingInfo(),
      });

      host.data.set({ id: 1, name: "Modified" });

      vi.spyOn(globalThis, "confirm").mockReturnValue(true);

      await host.doRefresh();

      expect(host.loadFn).toHaveBeenCalled();
      expect(host.data().name).toBe("Refreshed");

      vi.restoreAllMocks();
    });
  });

  //#endregion

  //#region Unit Tests — submit

  describe("doSubmit", () => {
    it("변경사항이 있으면 submit이 호출되고 성공 토스트가 표시된다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });

      host.data.set({ id: 1, name: "Modified" });
      host.submitFn.mockResolvedValue(true);
      host.loadFn.mockResolvedValue({
        data: { id: 1, name: "Modified" },
        info: makeExistingInfo(),
      });

      await host.doSubmit();

      expect(host.submitFn).toHaveBeenCalledWith({ id: 1, name: "Modified" });
      expect(mockToast.success).toHaveBeenCalledWith("저장되었습니다.");
    });

    it("변경사항이 없으면 info 토스트가 표시되고 submit이 호출되지 않는다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });

      // 데이터 미변경 (스냅샷과 동일)

      await host.doSubmit();

      expect(host.submitFn).not.toHaveBeenCalled();
      expect(mockToast.info).toHaveBeenCalledWith("변경사항이 없습니다.");
    });

    it("hideNoChangeMessage 옵션이 true이면 변경사항 없을 때 토스트를 표시하지 않는다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });

      await host.doSubmit({ hideNoChangeMessage: true });

      expect(host.submitFn).not.toHaveBeenCalled();
      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it("isNew인 항목은 변경사항 체크를 생략하고 submit이 호출된다", async () => {
      const { host } = await createFixtureAndInit(
        { id: undefined, name: "New Item" },
        makeNewInfo(),
      );

      host.submitFn.mockResolvedValue(true);
      host.loadFn.mockResolvedValue({
        data: { id: 1, name: "New Item" },
        info: makeExistingInfo(),
      });

      await host.doSubmit();

      expect(host.submitFn).toHaveBeenCalledWith({ id: undefined, name: "New Item" });
      expect(mockToast.success).toHaveBeenCalledWith("저장되었습니다.");
    });

    it("permCheck가 true이고 canEdit가 false이면 submit이 호출되지 않는다", async () => {
      const { host } = await createFixtureAndInit();

      host.canEdit.set(false);
      host.data.set({ id: 1, name: "Modified" });

      await host.doSubmit({ permCheck: true });

      expect(host.submitFn).not.toHaveBeenCalled();
    });

    it("busyCount > 0이면 submit이 호출되지 않는다", async () => {
      const { host } = await createFixtureAndInit();

      host.busyCount.set(1);
      host.data.set({ id: 1, name: "Modified" });

      await host.doSubmit();

      expect(host.submitFn).not.toHaveBeenCalled();
    });

    it("submit 결과가 falsy이면 토스트와 close가 발생하지 않는다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });

      host.data.set({ id: 1, name: "Modified" });
      host.submitFn.mockResolvedValue(undefined);

      const closeSpy = vi.fn();
      host.close.subscribe(closeSpy);

      await host.doSubmit();

      expect(host.submitFn).toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  //#endregion

  //#region Unit Tests — toggleDelete

  describe("doToggleDelete", () => {
    it("삭제 성공 시 토스트가 표시되고 close가 emit된다", async () => {
      const { host } = await createFixtureAndInit(
        { id: 1, name: "Item" },
        makeExistingInfo(),
      );

      host.toggleDeleteFn.mockResolvedValue(true);

      const closeSpy = vi.fn();
      host.close.subscribe(closeSpy);

      await host.doToggleDelete(true);

      expect(host.toggleDeleteFn).toHaveBeenCalledWith(true);
      expect(mockToast.success).toHaveBeenCalledWith("삭제되었습니다.");
      expect(closeSpy).toHaveBeenCalledWith(true);
    });

    it("복원 성공 시 토스트가 표시되고 close가 emit된다", async () => {
      const { host } = await createFixtureAndInit(
        { id: 1, name: "Item" },
        makeExistingInfo({ isDeleted: true }),
      );

      host.toggleDeleteFn.mockResolvedValue(true);

      const closeSpy = vi.fn();
      host.close.subscribe(closeSpy);

      await host.doToggleDelete(false);

      expect(host.toggleDeleteFn).toHaveBeenCalledWith(false);
      expect(mockToast.success).toHaveBeenCalledWith("복구되었습니다.");
      expect(closeSpy).toHaveBeenCalledWith(true);
    });

    it("canEdit가 false이면 삭제를 무시한다", async () => {
      const { host } = await createFixtureAndInit();

      host.canEdit.set(false);

      await host.doToggleDelete(true);

      expect(host.toggleDeleteFn).not.toHaveBeenCalled();
    });

    it("canDelete가 false이면 삭제를 무시한다", async () => {
      const { host } = await createFixtureAndInit();

      host.canDelete = signal(false);

      await host.doToggleDelete(true);

      expect(host.toggleDeleteFn).not.toHaveBeenCalled();
    });

    it("busyCount > 0이면 삭제를 무시한다", async () => {
      const { host } = await createFixtureAndInit();

      host.busyCount.set(1);

      await host.doToggleDelete(true);

      expect(host.toggleDeleteFn).not.toHaveBeenCalled();
    });

    it("toggleDelete 결과가 falsy이면 토스트와 close가 발생하지 않는다", async () => {
      const { host } = await createFixtureAndInit();

      host.toggleDeleteFn.mockResolvedValue(undefined);

      const closeSpy = vi.fn();
      host.close.subscribe(closeSpy);

      await host.doToggleDelete(true);

      expect(host.toggleDeleteFn).toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  //#endregion

  //#region Unit Tests — checkIgnoreChanges

  describe("checkIgnoreChanges", () => {
    it("스냅샷이 없으면 true를 반환한다", async () => {
      const { host } = await createFixtureAndInit(
        { id: undefined, name: "New" },
        makeNewInfo(),
      );

      expect(host.checkIgnoreChanges()).toBe(true);
    });

    it("데이터가 스냅샷과 같으면 true를 반환한다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Same" });

      expect(host.checkIgnoreChanges()).toBe(true);
    });

    it("데이터가 변경되었고 confirm이 true이면 true를 반환한다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });
      host.data.set({ id: 1, name: "Modified" });

      vi.spyOn(globalThis, "confirm").mockReturnValue(true);

      expect(host.checkIgnoreChanges()).toBe(true);

      vi.restoreAllMocks();
    });

    it("데이터가 변경되었고 confirm이 false이면 false를 반환한다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Original" });
      host.data.set({ id: 1, name: "Modified" });

      vi.spyOn(globalThis, "confirm").mockReturnValue(false);

      expect(host.checkIgnoreChanges()).toBe(false);

      vi.restoreAllMocks();
    });
  });

  //#endregion

  //#region Unit Tests — refresh

  describe("refresh", () => {
    it("기존 항목 로드 후 스냅샷이 저장된다", async () => {
      const { host } = await createFixtureAndInit({ id: 1, name: "Item" });

      // 데이터를 변경하지 않았으므로 변경 없음
      expect(host.checkIgnoreChanges()).toBe(true);

      // 데이터 변경
      host.data.set({ id: 1, name: "Changed" });
      vi.spyOn(globalThis, "confirm").mockReturnValue(false);
      expect(host.checkIgnoreChanges()).toBe(false);

      vi.restoreAllMocks();
    });

    it("새 항목 로드 후에는 스냅샷이 저장되지 않는다", async () => {
      const { host } = await createFixtureAndInit(
        { id: undefined, name: "New" },
        makeNewInfo(),
      );

      // 새 항목이므로 스냅샷 없음 → 항상 true
      host.data.set({ id: undefined, name: "Modified New" });
      expect(host.checkIgnoreChanges()).toBe(true);
    });
  });

  //#endregion
});
