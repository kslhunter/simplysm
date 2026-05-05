import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import { SDSBTestHost, testItem } from "./sd-shared-data-select-button-test.fixture";

let mockModal: { showAsync: ReturnType<typeof vi.spyOn> };

function setupTestBed() {
  TestBed.configureTestingModule({
    imports: [SDSBTestHost],
  });
  const modalProvider = TestBed.inject(SdModalProvider);
  mockModal = {
    showAsync: vi.spyOn(modalProvider, "showAsync").mockResolvedValue(undefined),
  };
}

async function createFixture(opts?: {
  value?: number | number[];
  selectMode?: "single" | "multi";
  items?: ReturnType<typeof testItem>[];
}) {
  const fixture = TestBed.createComponent(SDSBTestHost);
  const host = fixture.componentInstance;

  if (opts?.items != null) {
    host.items.set(opts.items);
  }
  if (opts?.selectMode != null) {
    host.selectMode.set(opts.selectMode);
  }
  if (opts?.value != null) {
    host.value.set(opts.value as any);
  }

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();

  return { fixture, host };
}

function getItemNameTexts(fixture: { nativeElement: HTMLElement }): string[] {
  const els = fixture.nativeElement.querySelectorAll<HTMLElement>(".item-name");
  return Array.from(els).map((el) => el.textContent.trim());
}

describe("SdSharedDataSelectButton", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region value+items 자동 동기화

  describe("value+items 자동 동기화", () => {
    it("single 모드: value 설정 시 items에서 해당 항목이 selectedItems로 자동 추출되어 표시된다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B"), testItem(3, "C")];
      const { fixture } = await createFixture({ items, value: 2 });

      expect(getItemNameTexts(fixture)).toEqual(["B"]);
    });

    it("multi 모드: value 배열 설정 시 items에서 해당 항목들이 자동 추출된다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B"), testItem(3, "C")];
      const { fixture } = await createFixture({
        items,
        selectMode: "multi",
        value: [1, 3],
      });

      expect(getItemNameTexts(fixture)).toEqual(["A", "C"]);
    });

    it("value가 null이면 표시 항목이 없다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B")];
      const { fixture } = await createFixture({ items });

      expect(getItemNameTexts(fixture)).toEqual([]);
    });

    it("multi 모드에서 value가 빈 배열이면 표시 항목이 없다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B")];
      const { fixture } = await createFixture({
        items,
        selectMode: "multi",
        value: [],
      });

      expect(getItemNameTexts(fixture)).toEqual([]);
    });

    it("multi 모드에서 value에 일치하지 않는 키가 있으면 무시된다", async () => {
      const items = [testItem(1, "A")];
      const { fixture } = await createFixture({
        items,
        selectMode: "multi",
        value: [1, 999],
      });

      expect(getItemNameTexts(fixture)).toEqual(["A"]);
    });
  });

  //#endregion

  //#region items 변경 시 재계산

  describe("items 변경 시 selectedItems 재계산", () => {
    it("value는 그대로이고 items만 변경되면 표시가 갱신된다", async () => {
      const { fixture, host } = await createFixture({
        items: [testItem(1, "A_old")],
        value: 1,
      });
      expect(getItemNameTexts(fixture)).toEqual(["A_old"]);

      host.items.set([testItem(1, "A_new")]);
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(getItemNameTexts(fixture)).toEqual(["A_new"]);
    });

    it("items에서 value에 해당하는 항목이 사라지면 표시 항목이 비워진다", async () => {
      const { fixture, host } = await createFixture({
        items: [testItem(1, "A")],
        value: 1,
      });
      expect(getItemNameTexts(fixture)).toEqual(["A"]);

      host.items.set([testItem(2, "B")]);
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(getItemNameTexts(fixture)).toEqual([]);
    });
  });

  //#endregion

  //#region 모달 선택 흐름 (SdModalSelectButton 위임)

  describe("모달 선택 흐름", () => {
    it("검색 버튼 클릭 시 SdModalProvider.showAsync가 호출되고 결과 selectedKeys가 value로 반영된다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B")];
      mockModal.showAsync.mockResolvedValue({
        selectedKeys: [2],
      });

      const { fixture, host } = await createFixture({ items });

      const el = fixture.nativeElement as HTMLElement;
      const searchBtn = el.querySelector<HTMLElement>(
        "sd-modal-select-button ._button sd-button button",
      );
      expect(searchBtn).not.toBeNull();
      searchBtn!.click();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(mockModal.showAsync).toHaveBeenCalled();
      expect(host.value()).toBe(2);
      expect(getItemNameTexts(fixture)).toEqual(["B"]);
    });

    it("모달 취소(undefined 반환) 시 value가 변경되지 않는다", async () => {
      const items = [testItem(1, "A")];
      mockModal.showAsync.mockResolvedValue(undefined);

      const { fixture, host } = await createFixture({ items, value: 1 });

      const el = fixture.nativeElement as HTMLElement;
      const searchBtn = el.querySelector<HTMLElement>(
        "sd-modal-select-button ._button sd-button button",
      );
      searchBtn!.click();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.value()).toBe(1);
    });
  });

  //#endregion
});
