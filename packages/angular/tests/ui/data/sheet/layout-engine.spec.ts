import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSheetLayoutEngine } from "../../../../src/ui/data/sheet/useSheetLayoutEngine";
import type { SdSheetConfig } from "../../../../src/ui/data/sheet/types";
import type { SdSheetColumn } from "../../../../src/ui/data/sheet/sd-sheet-column";

function mockColumn(overrides: Partial<{
  key: string;
  header: string | string[];
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
  cellTplRef: unknown;
  summaryTplRef: unknown;
}>): SdSheetColumn {
  return {
    key: signal(overrides.key ?? "col"),
    header: signal(overrides.header ?? ""),
    width: signal(overrides.width),
    fixed: signal(overrides.fixed ?? false),
    hidden: signal(overrides.hidden ?? false),
    collapse: signal(overrides.collapse ?? false),
    disableSorting: signal(overrides.disableSorting ?? false),
    disableResizing: signal(overrides.disableResizing ?? false),
    ordering: signal(overrides.ordering ?? 0),
    cellTplRef: signal(overrides.cellTplRef ?? null),
    summaryTplRef: signal(overrides.summaryTplRef ?? null),
  } as unknown as SdSheetColumn;
}

describe("useSheetLayoutEngine", () => {
  it("단일 컬럼: columnDefs에 1개, headerDefTable에 1행 1셀", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", width: "200px" }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs().length).toBe(1);
    expect(layout.columnDefs()[0].key).toBe("name");
    expect(layout.columnDefs()[0].width).toBe("200px");

    expect(layout.headerDefTable().length).toBe(1);
    expect(layout.headerDefTable()[0].length).toBe(1);
    expect(layout.headerDefTable()[0][0].text).toBe("이름");
  });

  it("hidden 컬럼은 columnDefs에서 제외된다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", hidden: false }),
      mockColumn({ key: "age", header: "나이", hidden: true }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs().length).toBe(1);
    expect(layout.columnDefs()[0].key).toBe("name");
  });

  it("다중 레벨 헤더: 같은 그룹명은 colspan으로 병합된다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "col1", header: ["그룹A", "세부1"] }),
      mockColumn({ key: "col2", header: ["그룹A", "세부2"] }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    const table = layout.headerDefTable();
    expect(table.length).toBe(2); // 2 rows

    // First row: 그룹A with colspan 2
    expect(table[0].length).toBe(1);
    expect(table[0][0].text).toBe("그룹A");
    expect(table[0][0].colspan).toBe(2);

    // Second row: 세부1, 세부2
    expect(table[1].length).toBe(2);
    expect(table[1][0].text).toBe("세부1");
    expect(table[1][1].text).toBe("세부2");
  });

  it("hasSummary: summaryTplRef가 있으면 true", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", summaryTplRef: {} }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.hasSummary()).toBe(true);
  });

  it("hasSummary: summaryTplRef가 없으면 false", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름" }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.hasSummary()).toBe(false);
  });

  it("config 적용: config에서 width를 오버라이드한다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", width: "200px" }),
    ]);
    const config = signal<SdSheetConfig | undefined>({
      columnRecord: {
        name: { width: "300px" },
      },
    });

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs()[0].width).toBe("300px");
  });

  it("config 적용: config에서 hidden을 오버라이드한다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", hidden: false }),
      mockColumn({ key: "age", header: "나이", hidden: false }),
    ]);
    const config = signal<SdSheetConfig | undefined>({
      columnRecord: {
        age: { hidden: true },
      },
    });

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs().length).toBe(1);
    expect(layout.columnDefs()[0].key).toBe("name");
  });

  it("config 적용: config에서 ordering을 오버라이드한다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", ordering: 2 }),
      mockColumn({ key: "age", header: "나이", ordering: 1 }),
    ]);
    const config = signal<SdSheetConfig | undefined>({
      columnRecord: {
        name: { ordering: 10 },
        age: { ordering: 5 },
      },
    });

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs()[0].key).toBe("age");
    expect(layout.columnDefs()[1].key).toBe("name");
  });

  it("config 적용: config에서 fixed를 오버라이드한다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "name", header: "이름", fixed: false }),
    ]);
    const config = signal<SdSheetConfig | undefined>({
      columnRecord: {
        name: { fixed: true },
      },
    });

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs()[0].fixed).toBe(true);
  });

  it("ordering에 따라 컬럼 순서가 정렬된다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "c", header: "C", ordering: 3 }),
      mockColumn({ key: "a", header: "A", ordering: 1 }),
      mockColumn({ key: "b", header: "B", ordering: 2 }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    expect(layout.columnDefs().map((d) => d.key)).toEqual(["a", "b", "c"]);
  });

  it("단일 헤더와 다중 헤더 혼합 시 rowspan이 설정된다", () => {
    TestBed.configureTestingModule({});
    const cols = signal<readonly SdSheetColumn[]>([
      mockColumn({ key: "col1", header: "단일" }),
      mockColumn({ key: "col2", header: ["그룹", "세부"] }),
    ]);
    const config = signal<SdSheetConfig | undefined>(undefined);

    const layout = useSheetLayoutEngine({ columnControls: cols, config });

    const table = layout.headerDefTable();
    expect(table.length).toBe(2); // 2 rows (max depth)

    // "단일" should have rowspan=2 (spanning both rows)
    expect(table[0][0].text).toBe("단일");
    expect(table[0][0].rowspan).toBe(2);

    // "그룹" in first row
    expect(table[0][1].text).toBe("그룹");

    // "세부" in second row
    expect(table[1][0].text).toBe("세부");
  });
});
