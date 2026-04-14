import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSheetLayoutEngine } from "../../../src/data/sheet/useSheetLayoutEngine";

function createMockColumnControl(opts: {
  key: string;
  header: string | string[];
  headerStyle?: string;
  tooltip?: string;
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
    headerStyle: signal(opts.headerStyle),
    tooltip: signal(opts.tooltip),
    width: signal(opts.width),
    fixed: signal(opts.fixed ?? false),
    hidden: signal(opts.hidden ?? false),
    collapse: signal(opts.collapse ?? false),
    disableSorting: signal(opts.disableSorting ?? false),
    disableResizing: signal(opts.disableResizing ?? false),
    ordering: signal(opts.ordering ?? 0),
    summaryTplRef: signal(undefined),
    headerTplRef: signal(undefined),
  };
}

describe("Feature 1.1: headerStyle/tooltip columnDefs 매핑", () => {
  it("headerStyle이 설정된 컬럼의 columnDef에 headerStyle이 포함된다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: "A", headerStyle: "color: red" }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      expect(engine.columnDefs()[0].headerStyle).toBe("color: red");
    });
  });

  it("tooltip이 설정된 컬럼의 columnDef에 tooltip이 포함된다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: "A", tooltip: "도움말" }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      expect(engine.columnDefs()[0].tooltip).toBe("도움말");
    });
  });

  it("headerStyle/tooltip 미설정 시 undefined로 매핑된다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: "A" }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      expect(engine.columnDefs()[0].headerStyle).toBeUndefined();
      expect(engine.columnDefs()[0].tooltip).toBeUndefined();
    });
  });
});

describe("LOGIC-015: header merge spanStartHeaders tracking", () => {
  it("3개 이상 연속 동일 상위 헤더가 올바르게 머지된다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: ["X", "A1"], ordering: 0 }),
        createMockColumnControl({ key: "b", header: ["X", "B1"], ordering: 1 }),
        createMockColumnControl({ key: "c", header: ["X", "C1"], ordering: 2 }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      const table = engine.headerDefTable();
      // Row 0: X가 colspan=3으로 머지
      expect(table[0].length).toBe(1);
      expect(table[0][0].text).toBe("X");
      expect(table[0][0].colspan).toBe(3);

      // Row 1: A1, B1, C1 각각 별도
      expect(table[1].length).toBe(3);
    });
  });

  it("연속 컬럼 중간에 다른 상위 헤더가 있으면 머지되지 않는다", () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const cols = signal([
        createMockColumnControl({ key: "a", header: ["X", "A1"], ordering: 0 }),
        createMockColumnControl({ key: "b", header: ["Y", "B1"], ordering: 1 }),
        createMockColumnControl({ key: "c", header: ["X", "C1"], ordering: 2 }),
      ] as any);

      const engine = useSheetLayoutEngine({
        columnControls: cols as any,
        config: signal(undefined),
      });

      const table = engine.headerDefTable();
      // Row 0: X, Y, X 각각 별도
      expect(table[0].length).toBe(3);
      expect(table[0][0].text).toBe("X");
      expect(table[0][1].text).toBe("Y");
      expect(table[0][2].text).toBe("X");
    });
  });
});

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
