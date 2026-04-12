import { describe, it, expect, vi, afterEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { injectSheetColumnResizing } from "../../../src/data/sheet/injectSheetColumnResizing";
import type { SdSheetConfig } from "../../../src/data/sheet/types";

function setup(configInitial?: SdSheetConfig) {
  const configValue = signal<SdSheetConfig | undefined>(configInitial);
  const setConfig = vi.fn((v: SdSheetConfig) => configValue.set(v));

  const container = document.createElement("div");
  const mockDomAccessor = {
    getHostEl: () => document.createElement("div"),
    getContainer: () => container,
    getTable: () => document.createElement("table"),
    getTHead: () => document.createElement("thead"),
    getRow: () => null,
    getCell: () => null,
    getColumnResizeIndicator: () => document.createElement("div"),
    getLastDepthFixedHeaders: () => [],
  };

  let result!: ReturnType<typeof injectSheetColumnResizing>;
  TestBed.runInInjectionContext(() => {
    result = injectSheetColumnResizing({
      domAccessor: mockDomAccessor,
      configResource: { value: configValue, set: setConfig },
    });
  });
  return { result, configValue, setConfig, container };
}

afterEach(() => {
  TestBed.resetTestingModule();
});

describe("injectSheetColumnResizing", () => {
  describe("Rule: composable 추출 후 기존 동작 유지", () => {
    it("초기 상태 — isResizing은 false, indicatorLeft은 0", () => {
      const { result } = setup();
      expect(result.isResizing()).toBe(false);
      expect(result.indicatorLeft()).toBe(0);
      expect(result.lastResizeEndTimeStamp()).toBe(0);
    });

    it("onMousedown — isResizing이 true가 되고 indicatorLeft이 설정된다", () => {
      const { result } = setup();

      const th = document.createElement("th");
      Object.defineProperty(th, "offsetWidth", { value: 200 });
      Object.defineProperty(th, "offsetLeft", { value: 50 });

      const resizer = document.createElement("div");
      th.appendChild(resizer);

      const event = new MouseEvent("mousedown", { clientX: 100, bubbles: true });
      Object.defineProperty(event, "target", { value: resizer });

      result.onMousedown(event, { key: "name", header: "이름", width: "200px", fixed: false, hidden: false, collapse: false, disableSorting: false, disableResizing: false, ordering: 0 });

      expect(result.isResizing()).toBe(true);
      // indicatorLeft = th.offsetLeft + th.offsetWidth - container.scrollLeft = 50 + 200 - 0 = 250
      expect(result.indicatorLeft()).toBe(250);
    });

    it("mouseup 후 — isResizing이 false가 되고 config에 새 너비가 저장된다", () => {
      const { result, setConfig } = setup();

      const th = document.createElement("th");
      Object.defineProperty(th, "offsetWidth", { value: 200 });
      Object.defineProperty(th, "offsetLeft", { value: 0 });

      const resizer = document.createElement("div");
      th.appendChild(resizer);

      const mousedownEvent = new MouseEvent("mousedown", { clientX: 100, bubbles: true });
      Object.defineProperty(mousedownEvent, "target", { value: resizer });

      result.onMousedown(mousedownEvent, { key: "name", header: "이름", width: "200px", fixed: false, hidden: false, collapse: false, disableSorting: false, disableResizing: false, ordering: 0 });

      // Simulate mouseup with 50px drag
      document.dispatchEvent(new MouseEvent("mouseup", { clientX: 150 }));

      expect(result.isResizing()).toBe(false);
      expect(setConfig).toHaveBeenCalledWith({
        columnRecord: { name: { width: "250px" } },
      });
    });

    it("최소 너비 — 5px 미만으로 축소 불가", () => {
      const { result, setConfig } = setup();

      const th = document.createElement("th");
      Object.defineProperty(th, "offsetWidth", { value: 200 });
      Object.defineProperty(th, "offsetLeft", { value: 0 });

      const resizer = document.createElement("div");
      th.appendChild(resizer);

      const event = new MouseEvent("mousedown", { clientX: 1000, bubbles: true });
      Object.defineProperty(event, "target", { value: resizer });

      result.onMousedown(event, { key: "name", header: "이름", width: "200px", fixed: false, hidden: false, collapse: false, disableSorting: false, disableResizing: false, ordering: 0 });

      document.dispatchEvent(new MouseEvent("mouseup", { clientX: 0 }));

      expect(setConfig).toHaveBeenCalledWith({
        columnRecord: { name: { width: "5px" } },
      });
    });

    it("onDblClick — config에서 width가 제거된다", () => {
      const { result, setConfig } = setup({
        columnRecord: { name: { width: "300px" } },
      });

      const event = new MouseEvent("dblclick", { bubbles: true });

      result.onDblClick(event, { key: "name", header: "이름", width: "300px", fixed: false, hidden: false, collapse: false, disableSorting: false, disableResizing: false, ordering: 0 });

      const call = setConfig.mock.calls[0][0];
      expect(call.columnRecord["name"].width).toBeUndefined();
    });

    it("lastResizeEndTimeStamp — mouseup 시 갱신된다", () => {
      const { result } = setup();

      const th = document.createElement("th");
      Object.defineProperty(th, "offsetWidth", { value: 200 });
      Object.defineProperty(th, "offsetLeft", { value: 0 });

      const resizer = document.createElement("div");
      th.appendChild(resizer);

      const event = new MouseEvent("mousedown", { clientX: 100, bubbles: true });
      Object.defineProperty(event, "target", { value: resizer });

      result.onMousedown(event, { key: "name", header: "이름", width: "200px", fixed: false, hidden: false, collapse: false, disableSorting: false, disableResizing: false, ordering: 0 });

      const mouseupEvent = new MouseEvent("mouseup", { clientX: 150 });
      document.dispatchEvent(mouseupEvent);

      expect(result.lastResizeEndTimeStamp()).toBe(mouseupEvent.timeStamp);
    });
  });
});
