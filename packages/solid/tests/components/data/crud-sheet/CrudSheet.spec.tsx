import { describe, it, expect } from "vitest";
import type { JSX } from "solid-js";
import {
  CrudSheetColumn,
  isCrudSheetColumnDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetColumn";
import {
  CrudSheetFilter,
  isCrudSheetFilterDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetFilter";
import {
  CrudSheetTools,
  isCrudSheetToolsDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetTools";
import {
  CrudSheetHeader,
  isCrudSheetHeaderDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetHeader";

interface TestItem {
  id?: number;
  name: string;
  isDeleted: boolean;
}

describe("CrudSheet types", () => {
  it("CrudSheetColumn: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetColumn<TestItem>({
      key: "name",
      header: "이름",
      children: (ctx) => <div>{ctx.item.name}</div>,
    });

    expect(isCrudSheetColumnDef(def)).toBe(true);
    expect((def as any).key).toBe("name");
  });

  it("CrudSheetFilter: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetFilter({
      children: (_filter, _setFilter) => <div>filter</div>,
    });

    expect(isCrudSheetFilterDef(def)).toBe(true);
  });

  it("CrudSheetTools: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetTools({
      children: (_ctx) => <div>tools</div>,
    });

    expect(isCrudSheetToolsDef(def)).toBe(true);
  });

  it("CrudSheetHeader: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetHeader({
      children: <div>header</div>,
    });

    expect(isCrudSheetHeaderDef(def)).toBe(true);
  });
});
