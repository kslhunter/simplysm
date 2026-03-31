import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { SdAppStructureProvider } from "../../../src/core/providers/sd-app-structure.provider";
import { SdToastProvider } from "../../../src/ui/overlay/toast/sd-toast.provider";
import { SdSharedDataProvider } from "../../../src/core/providers/sd-shared-data.provider";
import { SdFileDialogProvider } from "../../../src/core/providers/sd-file-dialog.provider";
import { DSTestHost, type TestItem } from "./sd-data-sheet-test.fixture";

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

function createMockFileDialog() {
  return {
    showAsync: vi.fn(),
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

function setupTestBed() {
  TestBed.configureTestingModule({
    imports: [DSTestHost],
    providers: [
      { provide: SdAppStructureProvider, useValue: createMockAppStructure() },
      { provide: Router, useValue: { events: new Subject(), url: "/app/test" } },
      { provide: SdToastProvider, useValue: createMockToast() },
      { provide: SdSharedDataProvider, useValue: createMockSharedData() },
      { provide: SdFileDialogProvider, useValue: createMockFileDialog() },
    ],
  });
}

async function createFixtureAndInit(items: TestItem[] = [], pageLength = 0) {
  const fixture = TestBed.createComponent(DSTestHost);
  const host = fixture.componentInstance;
  host.searchFn.mockResolvedValue({ items, pageLength });

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();

  return { fixture, host };
}

describe("Feature 7.2a Slice 1: 데이터 조회 기본", () => {
  beforeEach(() => {
    setupTestBed();
  });

  describe("Rule: 데이터 조회", () => {
    it("초기 로드 — search(true) 호출 후 items/pageLength/initialized 설정", async () => {
      const { host } = await createFixtureAndInit(
        [{ id: 1, name: "A" }, { id: 2, name: "B" }],
        3,
      );

      expect(host.searchFn).toHaveBeenCalledWith(true);
      expect(host.items()).toEqual([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
      expect(host.pageLength()).toBe(3);
      expect(host.initialized()).toBe(true);
    });

    it("권한 없는 사용자 — search 미호출, initialized=true", async () => {
      const fixture = TestBed.createComponent(DSTestHost);
      const host = fixture.componentInstance;
      host.canUse.set(false);
      host.searchFn.mockResolvedValue({ items: [] });

      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.searchFn).not.toHaveBeenCalled();
      expect(host.initialized()).toBe(true);
    });

    it("필터 적용 — page 0 리셋, lastFilter 갱신, search(true) 호출", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }], 2);
      host.searchFn.mockClear();
      host.page.set(1);

      host.searchFn.mockResolvedValue({ items: [{ id: 3, name: "C" }], pageLength: 1 });
      host.doFilterSubmit();

      expect(host.page()).toBe(0);

      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(host.searchFn).toHaveBeenCalledWith(true);
      expect(host.items()).toEqual([{ id: 3, name: "C" }]);
    });

    it("페이지 변경 — search(true) 호출", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }], 3);
      host.searchFn.mockClear();
      host.searchFn.mockResolvedValue({ items: [{ id: 2, name: "B" }], pageLength: 3 });

      host.page.set(1);
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(host.searchFn).toHaveBeenCalledWith(true);
      expect(host.items()).toEqual([{ id: 2, name: "B" }]);
    });

    it("정렬 변경 — search(true) 호출", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.searchFn.mockClear();
      host.searchFn.mockResolvedValue({ items: [{ id: 2, name: "B" }] });

      host.sortingDefs.set([{ key: "name", desc: true }]);
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(host.searchFn).toHaveBeenCalledWith(true);
    });

    it("새로고침 (미저장 변경 없음) — search(true) 호출", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.searchFn.mockClear();
      host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A-updated" }] });

      host.doRefresh();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(host.searchFn).toHaveBeenCalledWith(true);
      expect(host.items()).toEqual([{ id: 1, name: "A-updated" }]);
    });

    it("바쁜 상태에서 조회 시도 — 무시", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.searchFn.mockClear();
      host.page.set(2);

      host.busyCount.set(1);
      host.doFilterSubmit();
      host.doRefresh();

      // doFilterSubmit은 page를 0으로 리셋하지 않아야 함
      expect(host.page()).toBe(2);
    });
  });
});

describe("Feature 7.2a Slice 1: 단위 테스트", () => {
  beforeEach(() => {
    setupTestBed();
  });

  it("autoSelect — editMode=modal + selectMode=single → 'click'", async () => {
    const fixture = TestBed.createComponent(DSTestHost);
    const host = fixture.componentInstance;
    host.editMode = "modal";
    host.searchFn.mockResolvedValue({ items: [] });

    fixture.componentRef.setInput("selectMode", "single");
    fixture.detectChanges();
    TestBed.flushEffects();
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(host.autoSelect()).toBe("click");
  });

  it("autoSelect — editMode=inline + selectMode=single → undefined (canEdit=true)", async () => {
    const fixture = TestBed.createComponent(DSTestHost);
    const host = fixture.componentInstance;
    host.editMode = "inline";
    host.searchFn.mockResolvedValue({ items: [] });

    fixture.componentRef.setInput("selectMode", "single");
    fixture.detectChanges();
    TestBed.flushEffects();
    await new Promise<void>((r) => setTimeout(r, 0));

    // canEdit=true + editMode=inline → autoSelect is undefined
    expect(host.autoSelect()).toBeUndefined();
  });

  it("summaryData — search 결과에 summary 포함 시 설정", async () => {
    const { host } = await createFixtureAndInit();
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({
      items: [{ id: 1, name: "A" }],
      summary: { name: "합계" } as Partial<TestItem>,
    });

    host.doRefresh();
    TestBed.flushEffects();
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(host.summaryData()).toEqual({ name: "합계" });
  });

  it("doFilterSubmit — canUse=false 시 무시", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    host.canUse.set(false);

    host.page.set(2);
    host.doFilterSubmit();

    expect(host.page()).toBe(2); // page not reset
  });
});

describe("Feature 7.2a Slice 2: 인라인 편집 + 변경 추적", () => {
  beforeEach(() => {
    setupTestBed();
  });

  describe("Rule: 인라인 편집", () => {
    it("행 추가 — newItem()으로 목록 맨 앞에 추가", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.newItem = vi.fn().mockResolvedValue({ id: undefined, name: "New" });

      await host.doAddItem();

      expect(host.items().length).toBe(2);
      expect(host.items()[0]).toEqual({ id: undefined, name: "New" });
    });

    it("기존 항목 삭제 토글 — isDeleted 반전", async () => {
      const items = [{ id: 1, name: "A", isDeleted: false }];
      const { host } = await createFixtureAndInit(items);

      host.doToggleDeleteItem(host.items()[0]);

      expect(host.items()[0].isDeleted).toBe(true);
    });

    it("신규 항목 삭제 (key=undefined) — 목록에서 제거", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.newItem = vi.fn().mockResolvedValue({ id: undefined, name: "New", isDeleted: false });
      await host.doAddItem();

      expect(host.items().length).toBe(2);

      const newItem = host.items()[0]; // id=undefined
      host.doToggleDeleteItem(newItem);

      expect(host.items().length).toBe(1);
      expect(host.items()[0].name).toBe("A");
    });

    it("변경사항 저장 성공 — submit(diffs) 호출, 토스트, refresh", async () => {
      const items = [{ id: 1, name: "A", isDeleted: false }];
      const { host } = await createFixtureAndInit(items);

      // 항목 수정 (이름 변경)
      host.items()[0].name = "A-modified";
      host.items.update((v) => [...v]);

      const mockToast = TestBed.inject(SdToastProvider);
      host.submit = vi.fn().mockResolvedValue(true);
      host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A-modified" }] });

      await host.doSubmit();

      expect(host.submit).toHaveBeenCalled();
      const diffs = (host.submit as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(diffs.length).toBeGreaterThan(0);
      expect(mockToast.success).toHaveBeenCalledWith("저장되었습니다.");
    });

    it("변경 없이 저장 — 정보 토스트 표시", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
      host.submit = vi.fn();
      const mockToast = TestBed.inject(SdToastProvider);

      await host.doSubmit();

      expect(host.submit).not.toHaveBeenCalled();
      expect(mockToast.info).toHaveBeenCalledWith("변경사항이 없습니다.");
    });

    it("삭제된 항목 스타일 — text-decoration: line-through", async () => {
      const { host } = await createFixtureAndInit([
        { id: 1, name: "A", isDeleted: true },
      ]);

      const style = host.getItemCellStyleFn(host.items()[0]);
      expect(style).toBe("text-decoration: line-through;");
    });

    it("삭제되지 않은 항목 스타일 — undefined", async () => {
      const { host } = await createFixtureAndInit([
        { id: 1, name: "A", isDeleted: false },
      ]);

      const style = host.getItemCellStyleFn(host.items()[0]);
      expect(style).toBeUndefined();
    });
  });

  describe("Rule: 미저장 변경 감지", () => {
    it("새로고침 (미저장 변경 있음) — confirm 대화상자", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A", isDeleted: false }]);
      host.searchFn.mockClear();

      // 항목 수정
      host.items()[0].name = "modified";
      host.items.update((v) => [...v]);

      // confirm 거부
      vi.spyOn(globalThis, "confirm").mockReturnValue(false);
      host.doRefresh();

      expect(globalThis.confirm).toHaveBeenCalled();
      expect(host.searchFn).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("미저장 변경 + confirm 승인 → 새로고침 실행", async () => {
      const { host } = await createFixtureAndInit([{ id: 1, name: "A", isDeleted: false }]);
      host.searchFn.mockClear();
      host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A" }] });

      host.items()[0].name = "modified";
      host.items.update((v) => [...v]);

      vi.spyOn(globalThis, "confirm").mockReturnValue(true);
      host.doRefresh();

      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(host.searchFn).toHaveBeenCalledWith(true);

      vi.restoreAllMocks();
    });
  });
});

describe("Feature 7.2a Slice 3: 모달 편집", () => {
  beforeEach(() => {
    setupTestBed();
  });

  it("신규 등록 — editItem() 호출, 성공 시 refresh()", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    host.editMode = "modal";
    host.editItem = vi.fn().mockResolvedValue(true);
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A" }, { id: 2, name: "B" }] });

    await host.doEditItem();

    expect(host.editItem).toHaveBeenCalledWith(undefined);
    expect(host.searchFn).toHaveBeenCalledWith(true);
  });

  it("기존 항목 수정 — editItem(item) 호출, 성공 시 refresh()", async () => {
    const items = [{ id: 1, name: "A" }];
    const { host } = await createFixtureAndInit(items);
    host.editMode = "modal";
    host.editItem = vi.fn().mockResolvedValue(true);
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A-edited" }] });

    const targetItem = host.items()[0];
    await host.doEditItem(targetItem);

    expect(host.editItem).toHaveBeenCalledWith(targetItem);
    expect(host.searchFn).toHaveBeenCalled();
  });

  it("editItem 반환 false — refresh 미호출", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    host.editItem = vi.fn().mockResolvedValue(false);
    host.searchFn.mockClear();

    await host.doEditItem();

    expect(host.searchFn).not.toHaveBeenCalled();
  });

  it("선택 항목 삭제 — toggleDeleteItems(true) 호출, 성공 시 토스트", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    host.toggleDeleteItems = vi.fn().mockResolvedValue(true);
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({ items: [] });
    const mockToast = TestBed.inject(SdToastProvider);

    await host.doToggleDeleteItems(true);

    expect(host.toggleDeleteItems).toHaveBeenCalledWith(true);
    expect(mockToast.success).toHaveBeenCalledWith("삭제 되었습니다.");
  });

  it("선택 항목 복구 — toggleDeleteItems(false) 호출, 성공 시 토스트", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A", isDeleted: true }]);
    host.toggleDeleteItems = vi.fn().mockResolvedValue(true);
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "A", isDeleted: false }] });
    const mockToast = TestBed.inject(SdToastProvider);

    await host.doToggleDeleteItems(false);

    expect(host.toggleDeleteItems).toHaveBeenCalledWith(false);
    expect(mockToast.success).toHaveBeenCalledWith("복구 되었습니다.");
  });

  it("isSelectedItemsHasDeleted / isSelectedItemsHasNotDeleted 계산", async () => {
    const items = [
      { id: 1, name: "A", isDeleted: false },
      { id: 2, name: "B", isDeleted: true },
    ];
    const { host } = await createFixtureAndInit(items);
    host.selectedItems.set(host.items());

    expect(host.isSelectedItemsHasDeleted()).toBe(true);
    expect(host.isSelectedItemsHasNotDeleted()).toBe(true);
  });
});

describe("Feature 7.2a Slice 4: 엑셀 내보내기/가져오기", () => {
  beforeEach(() => {
    setupTestBed();
  });

  it("엑셀 다운로드 — search(false) 전체 조회 후 downloadExcel 호출", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    const allItems = [{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }];
    host.searchFn.mockResolvedValue({ items: allItems });
    host.downloadExcel = vi.fn();

    await host.doDownloadExcel();

    expect(host.searchFn).toHaveBeenCalledWith(false);
    expect(host.downloadExcel).toHaveBeenCalledWith(allItems);
  });

  it("엑셀 업로드 성공 — uploadExcel(file) 호출, refresh, 토스트", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    const mockFileDialog = TestBed.inject(SdFileDialogProvider);
    const mockToast = TestBed.inject(SdToastProvider);
    const fakeFile = new File(["data"], "test.xlsx");

    (mockFileDialog.showAsync as ReturnType<typeof vi.fn>).mockResolvedValue(fakeFile);
    host.uploadExcel = vi.fn();
    host.searchFn.mockClear();
    host.searchFn.mockResolvedValue({ items: [{ id: 1, name: "uploaded" }] });

    await host.doUploadExcel();

    expect(host.uploadExcel).toHaveBeenCalledWith(fakeFile);
    expect(host.searchFn).toHaveBeenCalledWith(true);
    expect(mockToast.success).toHaveBeenCalledWith("엑셀 업로드가 완료 되었습니다.");
  });

  it("엑셀 업로드 파일 선택 취소 — 무동작", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    const mockFileDialog = TestBed.inject(SdFileDialogProvider);

    (mockFileDialog.showAsync as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    host.uploadExcel = vi.fn();

    await host.doUploadExcel();

    expect(host.uploadExcel).not.toHaveBeenCalled();
  });
});

describe("Feature 7.2a Slice 5: 항목 선택 (모달 모드)", () => {
  beforeEach(() => {
    setupTestBed();
  });

  it("doModalConfirm — selectedItemKeys와 selectedItems 포함하여 close 발생", async () => {
    const items = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
    const { host } = await createFixtureAndInit(items);

    host.selectedItems.set([host.items()[0]]);
    TestBed.flushEffects();

    const closeSpy = vi.fn();
    host.close.subscribe(closeSpy);

    host.doModalConfirm();

    expect(closeSpy).toHaveBeenCalledWith({
      selectedItemKeys: [1],
      selectedItems: [host.items()[0]],
    });
  });

  it("doModalCancel — 빈 배열로 close 발생", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);

    const closeSpy = vi.fn();
    host.close.subscribe(closeSpy);

    host.doModalCancel();

    expect(closeSpy).toHaveBeenCalledWith({
      selectedItemKeys: [],
      selectedItems: [],
    });
  });

  it("getItemSelectableFn — canSelect 반환", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    expect(host.getItemSelectableFn(host.items()[0])).toBe(true);
  });

  it("trackByFn — key 반환", async () => {
    const { host } = await createFixtureAndInit([{ id: 1, name: "A" }]);
    expect(host.trackByFn(host.items()[0])).toBe(1);
  });

  it("trackByFn — key=undefined 시 item 자체 반환", async () => {
    const { host } = await createFixtureAndInit([{ id: undefined, name: "New" }]);
    const item = host.items()[0];
    expect(host.trackByFn(item)).toBe(item);
  });
});
