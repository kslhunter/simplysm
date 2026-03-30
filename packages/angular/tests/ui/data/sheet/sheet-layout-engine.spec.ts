import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSheetLayoutEngine } from "../../../../src/ui/data/sheet/useSheetLayoutEngine";

function createMockColumnControl(opts: {
  key: string;
  header: string | string[];
  width?: string;
  fixed?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  disableSorting?: boolean;
  disableResizing?: boolean;
  ordering?: number;
}) {
  return {
    key: signal(opts.key),
    header: signal(opts.header),
    width: signal(opts.width),
    fixed: signal(opts.fixed ?? false),
    hidden: signal(opts.hidden ?? false),
    collapse: signal(opts.collapse ?? false),
    disableSorting: signal(opts.disableSorting ?? false),
    disableResizing: signal(opts.disableResizing ?? false),
    ordering: signal(opts.ordering ?? 0),
    summaryTplRef: signal(undefined),
  };
}

describe("FIX-3 LOGIC-021: header merge parent level check", () => {
  it("다른 부모 아래 동일 텍스트 비최종행 헤더는 병합되지 않는다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      // 3-level headers: middle row "Mid" is non-final and same text but different parents
      const cols = signal([
        createMockColumnControl({ key: "a", header: ["Parent1", "Mid", "Leaf1"], ordering: 0 }),
        createMockColumnControl({ key: "b", header: ["Parent2", "Mid", "Leaf2"], ordering: 1 }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      const table = engine.headerDefTable();
      // Row 0 should have 2 separate cells: "Parent1" and "Parent2"
      expect(table[0].length).toBe(2);
      expect(table[0][0].text).toBe("Parent1");
      expect(table[0][1].text).toBe("Parent2");

      // Row 1 (non-final): "Mid" should NOT be merged because parents differ
      expect(table[1].length).toBe(2);
      expect(table[1][0].text).toBe("Mid");
      expect(table[1][1].text).toBe("Mid");
    });
  });

  it("같은 부모 아래 동일 텍스트 비최종행 헤더는 병합된다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: ["Parent", "Child", "Sub1"], ordering: 0 }),
        createMockColumnControl({ key: "b", header: ["Parent", "Child", "Sub2"], ordering: 1 }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      const table = engine.headerDefTable();
      // Row 0: "Parent" merged (colspan=2)
      expect(table[0].length).toBe(1);
      expect(table[0][0].text).toBe("Parent");
      expect(table[0][0].colspan).toBe(2);

      // Row 1: "Child" merged (colspan=2)
      expect(table[1].length).toBe(1);
      expect(table[1][0].text).toBe("Child");
      expect(table[1][0].colspan).toBe(2);

      // Row 2: "Sub1" and "Sub2" separate
      expect(table[2].length).toBe(2);
    });
  });
});
