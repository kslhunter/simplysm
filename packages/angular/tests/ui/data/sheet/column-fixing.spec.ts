import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSheetColumnFixing } from "../../../../src/ui/data/sheet/useSheetColumnFixing";
import type { ISdSheetColumnDef } from "../../../../src/ui/data/sheet/types";

function makeDef(overrides: Partial<ISdSheetColumnDef>): ISdSheetColumnDef {
  return {
    key: overrides.key ?? "col",
    header: overrides.header ?? "",
    width: overrides.width,
    fixed: overrides.fixed ?? false,
    hidden: overrides.hidden ?? false,
    collapse: overrides.collapse ?? false,
    disableSorting: overrides.disableSorting ?? false,
    ordering: overrides.ordering ?? 0,
  };
}

describe("useSheetColumnFixing", () => {
  it("고정 컬럼이 없으면 fixedLeftMap이 비어 있다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<ISdSheetColumnDef[]>([
      makeDef({ key: "a", width: "100px", fixed: false }),
    ]);

    const fixing = useSheetColumnFixing({ columnDefs: defs });

    expect(fixing.fixedLeftMap().size).toBe(0);
    expect(fixing.hasFixed()).toBe(false);
  });

  it("고정 컬럼 1개: left=0", () => {
    TestBed.configureTestingModule({});
    const defs = signal<ISdSheetColumnDef[]>([
      makeDef({ key: "a", width: "100px", fixed: true }),
      makeDef({ key: "b", width: "200px", fixed: false }),
    ]);

    const fixing = useSheetColumnFixing({ columnDefs: defs });

    expect(fixing.fixedLeftMap().get("a")).toBe(0);
    expect(fixing.hasFixed()).toBe(true);
  });

  it("고정 컬럼 3개: left 값이 누적된다 (0, 100, 250)", () => {
    TestBed.configureTestingModule({});
    const defs = signal<ISdSheetColumnDef[]>([
      makeDef({ key: "a", width: "100px", fixed: true }),
      makeDef({ key: "b", width: "150px", fixed: true }),
      makeDef({ key: "c", width: "200px", fixed: true }),
      makeDef({ key: "d", width: "300px", fixed: false }),
    ]);

    const fixing = useSheetColumnFixing({ columnDefs: defs });

    expect(fixing.fixedLeftMap().get("a")).toBe(0);
    expect(fixing.fixedLeftMap().get("b")).toBe(100);
    expect(fixing.fixedLeftMap().get("c")).toBe(250);
  });

  it("축소된 고정 컬럼은 fixedLeftMap에 포함되지 않는다", () => {
    TestBed.configureTestingModule({});
    const defs = signal<ISdSheetColumnDef[]>([
      makeDef({ key: "a", width: "100px", fixed: true, collapse: true }),
      makeDef({ key: "b", width: "150px", fixed: true }),
    ]);

    const fixing = useSheetColumnFixing({ columnDefs: defs });

    expect(fixing.fixedLeftMap().has("a")).toBe(false);
    expect(fixing.fixedLeftMap().get("b")).toBe(0);
  });
});
