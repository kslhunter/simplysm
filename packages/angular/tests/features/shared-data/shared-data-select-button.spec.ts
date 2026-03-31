import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/ui/overlay/modal/sd-modal.provider";
import { SDSBTestHost, testItem } from "./sd-shared-data-select-button-test.fixture";
import { SdSharedDataSelectButtonControl } from "../../../src/features/shared-data/sd-shared-data-select-button.control";
import type { ISdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button.control";

function createMockModalProvider() {
  return {
    showAsync: vi.fn().mockResolvedValue(undefined),
    modalCount: signal(0),
  };
}

let mockModal: ReturnType<typeof createMockModalProvider>;

function setupTestBed() {
  mockModal = createMockModalProvider();
  TestBed.configureTestingModule({
    imports: [SDSBTestHost],
    providers: [{ provide: SdModalProvider, useValue: mockModal }],
  });
}

async function createFixture(opts?: { value?: number | number[]; selectMode?: "single" | "multi" }) {
  const fixture = TestBed.createComponent(SDSBTestHost);
  const host = fixture.componentInstance;

  if (opts?.selectMode != null) {
    host.selectMode.set(opts.selectMode);
  }
  if (opts?.value !== undefined) {
    host.value.set(opts.value as any);
  }

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();

  return { fixture, host };
}

describe("SdSharedDataSelectButtonControl", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Unit Tests — load

  describe("load", () => {
    it("keys에 해당하는 항목만 반환한다", async () => {
      const { fixture } = await createFixture();
      const items = [testItem(1, "A"), testItem(2, "B"), testItem(3, "C")];
      fixture.componentInstance.items.set(items);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelectButtonControl<any, any, ISdSelectModal<any>>;
      expect(ctrl.load([1, 3])).toEqual([items[0], items[2]]);
    });

    it("일치하는 항목이 없으면 빈 배열을 반환한다", async () => {
      const { fixture } = await createFixture();
      fixture.componentInstance.items.set([testItem(1, "A")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelectButtonControl<any, any, ISdSelectModal<any>>;
      expect(ctrl.load([999])).toEqual([]);
    });
  });

  //#endregion

  //#region Acceptance — 모달 선택 흐름

  describe("모달 선택 흐름 (AbsSdDataSelectButton 위임)", () => {
    it("value 설정 시 load로 selectedItems가 채워진다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B")];
      const { fixture, host } = await createFixture();
      host.items.set(items);
      host.value.set(1);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelectButtonControl<any, any, ISdSelectModal<any>>;
      expect(ctrl.selectedItems()).toEqual([items[0]]);
    });

    it("doShowModal 호출 후 결과가 value에 반영된다", async () => {
      const items = [testItem(1, "A"), testItem(2, "B")];
      const { fixture, host } = await createFixture();
      host.items.set(items);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelectButtonControl<any, any, ISdSelectModal<any>>;
      mockModal.showAsync.mockResolvedValue({ selectedItemKeys: [2], selectedItems: [] });

      await ctrl.doShowModal();

      expect(host.value()).toBe(2);
    });
  });

  //#endregion
});
