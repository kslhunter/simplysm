import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSheetColumnFixing } from "../../../src/data/sheet/useSheetColumnFixing";
import type { SdSheetColumnDef } from "../../../src/data/sheet/types";

function makeDef(overrides: Partial<SdSheetColumnDef>): SdSheetColumnDef {
  return {
    key: overrides.key ?? "col",
    header: overrides.header ?? "",
    headerStyle: overrides.headerStyle,
    tooltip: overrides.tooltip,
    width: overrides.width,
    fixed: overrides.fixed ?? false,
    hidden: overrides.hidden ?? false,
    collapse: overrides.collapse ?? false,
    disableSorting: overrides.disableSorting ?? false,
    disableResizing: overrides.disableResizing ?? false,
    ordering: overrides.ordering ?? 0,
  };
}

describe("useSheetColumnFixing", () => {
  it("고정 데이터컬럼이 없으면 feature 셀만 fixedLeftMap에 포함된다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: false }),
    ]);
    const widths = signal(new Map<number, number>([[-1, 30]]));

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(false),
    });

    expect(fixing.fixedLeftMap().get(-1)).toBe(0);
    expect(fixing.fixedLeftMap().size).toBe(1);
  });

  it("고정 데이터컬럼 1개: feature 셀 뒤에 left가 누적된다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: true }),
      makeDef({ key: "b", fixed: false }),
    ]);
    const widths = signal(new Map<number, number>([[-1, 30], [0, 100]]));

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(false),
    });

    expect(fixing.fixedLeftMap().get(-1)).toBe(0);
    expect(fixing.fixedLeftMap().get(0)).toBe(30);
  });

  it("고정 데이터컬럼 3개: left 값이 feature 셀 포함하여 누적된다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: true }),
      makeDef({ key: "b", fixed: true }),
      makeDef({ key: "c", fixed: true }),
      makeDef({ key: "d", fixed: false }),
    ]);
    const widths = signal(
      new Map<number, number>([[-1, 30], [0, 100], [1, 150], [2, 200]]),
    );

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(false),
    });

    expect(fixing.fixedLeftMap().get(-1)).toBe(0);
    expect(fixing.fixedLeftMap().get(0)).toBe(30);
    expect(fixing.fixedLeftMap().get(1)).toBe(130);
    expect(fixing.fixedLeftMap().get(2)).toBe(280);
    expect(fixing.fixedLeftMap().has(3)).toBe(false);
  });

  it("expanding 있을 때 feature 셀 2개(-2, -1) 포함하여 누적된다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: true }),
    ]);
    const widths = signal(
      new Map<number, number>([[-2, 30], [-1, 30], [0, 100]]),
    );

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(true),
    });

    expect(fixing.fixedLeftMap().get(-2)).toBe(0);
    expect(fixing.fixedLeftMap().get(-1)).toBe(30);
    expect(fixing.fixedLeftMap().get(0)).toBe(60);
  });

  it("축소된 고정 컬럼은 fixedLeftMap에 포함되지 않는다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: true, collapse: true }),
      makeDef({ key: "b", fixed: true }),
    ]);
    const widths = signal(new Map<number, number>([[-1, 30], [1, 150]]));

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(false),
    });

    expect(fixing.fixedLeftMap().has(0)).toBe(false);
    expect(fixing.fixedLeftMap().get(-1)).toBe(0);
    expect(fixing.fixedLeftMap().get(1)).toBe(30);
  });

  it("width 미등록 셀은 0으로 처리된다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<SdSheetColumnDef[]>([
      makeDef({ key: "a", fixed: true }),
      makeDef({ key: "b", fixed: true }),
    ]);
    const widths = signal(new Map<number, number>([[-1, 30]]));

    const fixing = useSheetColumnFixing({
      columnDefs: defs,
      cellWidths: widths,
      hasExpandable: signal(false),
    });

    expect(fixing.fixedLeftMap().get(0)).toBe(30);
    expect(fixing.fixedLeftMap().get(1)).toBe(30);
  });
});
