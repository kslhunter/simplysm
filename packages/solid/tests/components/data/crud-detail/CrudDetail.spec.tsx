import { describe, it, expect } from "vitest";
import type {
  CrudDetailToolsDef,
  CrudDetailBeforeDef,
  CrudDetailAfterDef,
} from "../../../../src/components/data/crud-detail/types";
import {
  CrudDetailTools,
  isCrudDetailToolsDef,
} from "../../../../src/components/data/crud-detail/CrudDetailTools";
import {
  CrudDetailBefore,
  isCrudDetailBeforeDef,
} from "../../../../src/components/data/crud-detail/CrudDetailBefore";
import {
  CrudDetailAfter,
  isCrudDetailAfterDef,
} from "../../../../src/components/data/crud-detail/CrudDetailAfter";

describe("CrudDetail types", () => {
  it("CrudDetailToolsDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailToolsDef = {
      __type: "crud-detail-tools",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBeforeDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailBeforeDef = {
      __type: "crud-detail-before",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfterDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailAfterDef = {
      __type: "crud-detail-after",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-after");
  });
});

describe("CrudDetail sub-components", () => {
  it("CrudDetailTools: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailTools({
      children: <div>tools</div>,
    });

    expect(isCrudDetailToolsDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBefore: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailBefore({
      children: <div>before</div>,
    });

    expect(isCrudDetailBeforeDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfter: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailAfter({
      children: <div>after</div>,
    });

    expect(isCrudDetailAfterDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-after");
  });

  it("type guard: 일반 객체는 false를 반환한다", () => {
    expect(isCrudDetailToolsDef({})).toBe(false);
    expect(isCrudDetailToolsDef(null)).toBe(false);
    expect(isCrudDetailBeforeDef("string")).toBe(false);
    expect(isCrudDetailAfterDef(42)).toBe(false);
  });
});
