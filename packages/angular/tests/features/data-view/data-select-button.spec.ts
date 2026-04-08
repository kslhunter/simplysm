import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/ui/overlay/modal/sd-modal.provider";
import { DSBTestHost, type TestSelectItem } from "./sd-data-select-button-test.fixture";

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
    imports: [DSBTestHost],
    providers: [{ provide: SdModalProvider, useValue: mockModal }],
  });
}

async function createFixture(
  opts?: { selectMode?: "single" | "multi"; value?: number | number[] },
) {
  const fixture = TestBed.createComponent(DSBTestHost);
  const host = fixture.componentInstance;
  host.loadFn.mockResolvedValue([]);

  if (opts?.selectMode != null) {
    fixture.componentRef.setInput("selectMode", opts.selectMode);
  }
  if (opts?.value !== undefined) {
    fixture.componentRef.setInput("value", opts.value);
  }

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();

  return { fixture, host };
}

describe("SdDataSelectButtonBase", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Acceptance Tests — 자동 로드

  describe("value 변경 시 load()로 아이템을 자동 로드한다", () => {
    it("single mode에서 value 설정 시 load([value])가 호출되고 selectedItems가 설정된다", async () => {
      const items: TestSelectItem[] = [{ id: 5, name: "Item 5" }];

      const { fixture, host } = await createFixture();
      host.loadFn.mockResolvedValue(items);
      host.loadFn.mockClear();

      fixture.componentRef.setInput("value", 5);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.loadFn).toHaveBeenCalledWith([5]);
      expect(host.selectedItems()).toEqual(items);
    });

    it("multi mode에서 value 설정 시 load(keys)가 호출되고 selectedItems가 설정된다", async () => {
      const items: TestSelectItem[] = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ];

      const { fixture, host } = await createFixture({ selectMode: "multi" });
      host.loadFn.mockResolvedValue(items);
      host.loadFn.mockClear();

      fixture.componentRef.setInput("value", [1, 2, 3]);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.loadFn).toHaveBeenCalledWith([1, 2, 3]);
      expect(host.selectedItems()).toEqual(items);
    });

    it("value가 null이면 load가 호출되지 않고 selectedItems가 빈 배열이다", async () => {
      const { host } = await createFixture();
      host.loadFn.mockClear();

      expect(host.loadFn).not.toHaveBeenCalled();
      expect(host.selectedItems()).toEqual([]);
    });

    it("multi mode에서 value가 빈 배열이면 load가 호출되지 않는다", async () => {
      const { fixture, host } = await createFixture({ selectMode: "multi" });
      host.loadFn.mockClear();

      fixture.componentRef.setInput("value", []);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.loadFn).not.toHaveBeenCalled();
      expect(host.selectedItems()).toEqual([]);
    });

    it("multi mode에서 value에 null이 포함되면 filterExists 후 load한다", async () => {
      const items: TestSelectItem[] = [
        { id: 1, name: "A" },
        { id: 3, name: "C" },
      ];

      const { fixture, host } = await createFixture({ selectMode: "multi" });
      host.loadFn.mockResolvedValue(items);
      host.loadFn.mockClear();

      fixture.componentRef.setInput("value", [1, null, 3]);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(host.loadFn).toHaveBeenCalledWith([1, 3]);
      expect(host.selectedItems()).toEqual(items);
    });
  });

  //#endregion

  //#region Acceptance Tests — 모달 선택

  describe("모달로 데이터를 선택한다", () => {
    it("doShowModal 호출 시 SdModalProvider.showAsync가 호출된다", async () => {
      const { host } = await createFixture({ value: 5 });

      await host.doShowModal();

      expect(mockModal.showAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "테스트 선택",
          inputs: expect.objectContaining({
            selectMode: "single",
            selectedItemKeys: [5],
          }),
        }),
        undefined,
      );
    });

    it("single mode에서 모달 결과의 selectedItemKeys[0]이 value가 된다", async () => {
      mockModal.showAsync.mockResolvedValue({
        selectedItemKeys: [10],
        selectedItems: [{ id: 10, name: "New" }],
      });

      const { fixture, host } = await createFixture();

      await host.doShowModal();
      fixture.detectChanges();

      expect(host.value()).toBe(10);
    });

    it("multi mode에서 모달 결과의 selectedItemKeys 전체가 value가 된다", async () => {
      mockModal.showAsync.mockResolvedValue({
        selectedItemKeys: [1, 2],
        selectedItems: [],
      });

      const { fixture, host } = await createFixture({ selectMode: "multi" });

      await host.doShowModal();
      fixture.detectChanges();

      expect(host.value()).toEqual([1, 2]);
    });

    it("모달 취소 시 value가 변경되지 않는다", async () => {
      mockModal.showAsync.mockResolvedValue(undefined);

      const { fixture, host } = await createFixture({ value: 5 });

      await host.doShowModal();
      fixture.detectChanges();

      expect(host.value()).toBe(5);
    });
  });

  //#endregion

  //#region Acceptance Tests — 초기화

  describe("값을 초기화할 수 있다", () => {
    it("single mode 초기화 시 value가 undefined가 된다", async () => {
      const { fixture, host } = await createFixture({ value: 5 });

      host.doInitialValue();
      fixture.detectChanges();

      expect(host.value()).toBeUndefined();
    });

    it("multi mode 초기화 시 value가 빈 배열이 된다", async () => {
      const { fixture, host } = await createFixture({
        selectMode: "multi",
        value: [1, 2],
      });

      host.doInitialValue();
      fixture.detectChanges();

      expect(host.value()).toEqual([]);
    });
  });

  //#endregion

  //#region Unit Tests — isNoValue

  describe("isNoValue", () => {
    it("value가 undefined이면 true", async () => {
      const { host } = await createFixture();
      expect(host.isNoValue()).toBe(true);
    });

    it("value가 null이면 true", async () => {
      const { fixture, host } = await createFixture();
      fixture.componentRef.setInput("value", null);
      fixture.detectChanges();
      expect(host.isNoValue()).toBe(true);
    });

    it("single mode에서 value가 존재하면 false", async () => {
      const { host } = await createFixture({ value: 5 });
      expect(host.isNoValue()).toBe(false);
    });

    it("multi mode에서 value가 빈 배열이면 true", async () => {
      const { fixture, host } = await createFixture({ selectMode: "multi" });
      fixture.componentRef.setInput("value", []);
      fixture.detectChanges();
      expect(host.isNoValue()).toBe(true);
    });

    it("multi mode에서 value가 비어있지 않으면 false", async () => {
      const { host } = await createFixture({ selectMode: "multi", value: [1] });
      expect(host.isNoValue()).toBe(false);
    });
  });

  //#endregion

  //#region Unit Tests — 유효성 검사

  describe("required일 때 유효성 검사", () => {
    it("required=true이고 value=null이면 hidden input에 유효성 메시지가 설정된다", async () => {
      const fixture = TestBed.createComponent(DSBTestHost);
      const host = fixture.componentInstance;
      host.loadFn.mockResolvedValue([]);
      fixture.componentRef.setInput("required", true);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const hiddenInput = el.querySelector<HTMLInputElement>("input.sd-invalid-input");
      expect(hiddenInput).not.toBeNull();
      expect(hiddenInput!.validationMessage).toBe("값을 입력하세요.");
    });

    it("required=false이면 유효성 에러가 없다", async () => {
      const { fixture } = await createFixture();

      const el = fixture.nativeElement as HTMLElement;
      const hiddenInput = el.querySelector<HTMLInputElement>("input.sd-invalid-input");
      expect(hiddenInput).not.toBeNull();
      expect(hiddenInput!.validity.valid).toBe(true);
    });
  });

  //#endregion

  //#region Unit Tests — doShowModal 현재 값 전달

  describe("doShowModal 현재 값 전달", () => {
    it("single mode에서 value=null이면 selectedItemKeys가 빈 배열이다", async () => {
      const { host } = await createFixture();

      await host.doShowModal();

      expect(mockModal.showAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({ selectedItemKeys: [] }),
        }),
        undefined,
      );
    });

    it("multi mode에서 현재 value가 모달에 전달된다", async () => {
      const { host } = await createFixture({
        selectMode: "multi",
        value: [1, 2, 3],
      });

      await host.doShowModal();

      expect(mockModal.showAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({ selectedItemKeys: [1, 2, 3] }),
        }),
        undefined,
      );
    });
  });

  //#endregion
});

describe("SdDataSelectButton", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Acceptance Tests — 버튼 표시/숨김

  describe("버튼 표시/숨김", () => {
    it("disabled=true이면 검색 버튼이 렌더링되지 않는다", async () => {
      const { fixture } = await createFixture({ value: 5 });
      fixture.componentRef.setInput("disabled", true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchBtn = el.querySelector("sd-button");
      expect(searchBtn).toBeNull();
    });

    it("disabled=false이면 검색 버튼이 렌더링된다", async () => {
      const { fixture } = await createFixture({ value: 5 });

      const el = fixture.nativeElement as HTMLElement;
      const searchBtn = el.querySelector("sd-button");
      expect(searchBtn).not.toBeNull();
    });

    it("disabled=true이면 초기화 버튼이 렌더링되지 않는다", async () => {
      const { fixture } = await createFixture({ value: 5 });
      fixture.componentRef.setInput("disabled", true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const eraseBtn = el.querySelector("sd-anchor");
      expect(eraseBtn).toBeNull();
    });

    it("required=true이면 초기화 버튼이 렌더링되지 않는다", async () => {
      const { fixture } = await createFixture({ value: 5 });
      fixture.componentRef.setInput("required", true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const eraseBtn = el.querySelector("sd-anchor");
      expect(eraseBtn).toBeNull();
    });

    it("값이 비어있으면 초기화 버튼이 렌더링되지 않는다", async () => {
      const { fixture } = await createFixture();

      const el = fixture.nativeElement as HTMLElement;
      const eraseBtn = el.querySelector("sd-anchor");
      expect(eraseBtn).toBeNull();
    });

    it("disabled=false, required=false, 값이 있으면 초기화 버튼이 렌더링된다", async () => {
      const { fixture } = await createFixture({ value: 5 });

      const el = fixture.nativeElement as HTMLElement;
      const eraseBtn = el.querySelector("sd-anchor");
      expect(eraseBtn).not.toBeNull();
    });
  });

  //#endregion

  //#region Acceptance Tests — 아이템 템플릿 렌더링

  describe("아이템 템플릿 렌더링", () => {
    it("selectedItems에 아이템이 있으면 템플릿으로 렌더링된다", async () => {
      const items: TestSelectItem[] = [{ id: 1, name: "Alpha" }];
      const { fixture, host } = await createFixture();
      host.loadFn.mockResolvedValue(items);

      fixture.componentRef.setInput("value", 1);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const itemTexts = el.querySelectorAll(".item-text");
      expect(itemTexts.length).toBe(1);
      expect(itemTexts[0].textContent.trim()).toBe("Alpha");
    });

    it("여러 아이템은 쉼표 구분자로 렌더링된다", async () => {
      const items: TestSelectItem[] = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ];
      const { fixture, host } = await createFixture({ selectMode: "multi" });
      host.loadFn.mockResolvedValue(items);

      fixture.componentRef.setInput("value", [1, 2]);
      fixture.detectChanges();
      TestBed.flushEffects();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const itemTexts = el.querySelectorAll(".item-text");
      expect(itemTexts.length).toBe(2);

      const content = el.querySelector("sd-additional-button")!;
      expect(content.textContent).toContain(",");
    });

    it("아이템이 없으면 item-text가 렌더링되지 않는다", async () => {
      const { fixture } = await createFixture();

      const el = fixture.nativeElement as HTMLElement;
      const itemTexts = el.querySelectorAll(".item-text");
      expect(itemTexts.length).toBe(0);
    });
  });

  //#endregion

  //#region Unit Tests — host attribute

  describe("host attribute", () => {
    it("disabled=true이면 data-sd-disabled 속성이 true이다", async () => {
      const { fixture } = await createFixture({ value: 5 });
      fixture.componentRef.setInput("disabled", true);
      fixture.detectChanges();

      const sdBtn = fixture.nativeElement.querySelector("sd-data-select-button");
      expect(sdBtn?.getAttribute("data-sd-disabled")).toBe("true");
    });
  });

  //#endregion
});
