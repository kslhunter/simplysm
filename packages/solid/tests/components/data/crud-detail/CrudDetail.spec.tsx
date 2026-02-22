import { describe, it, expect } from "vitest";
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
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
import { CrudDetail } from "../../../../src/components/data/crud-detail/CrudDetail";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";

interface TestData {
  id?: number;
  name: string;
}

function TestWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>{props.children}</NotificationProvider>
    </ConfigContext.Provider>
  );
}

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

describe("CrudDetail rendering", () => {
  it("기본 렌더링: load 후 children이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
        >
          {(ctx) => <div data-testid="name">{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("홍길동");
  });

  it("submit 제공 시 저장 버튼이 toolbar에 표시된다 (page/control 모드)", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
  });

  it("submit 미제공 시 저장 버튼이 없다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
  });

  it("toggleDelete 제공 시 삭제 버튼이 toolbar에 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          toggleDelete={() => Promise.resolve(true)}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("삭제");
  });

  it("새로고침 버튼이 항상 toolbar에 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("새로고침");
  });

  it("canEdit=false 시 toolbar이 표시되지 않는다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          canEdit={() => false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).not.toContain("새로고침");
  });

  it("lastModifiedAt/By가 있으면 수정 정보가 표시된다", async () => {
    const { DateTime } = await import("@simplysm/core-common");

    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: {
                isNew: false,
                isDeleted: false,
                lastModifiedAt: new DateTime(2026, 1, 15, 10, 30),
                lastModifiedBy: "관리자",
              },
            })
          }
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("최종 수정");
    expect(container.textContent).toContain("관리자");
  });
});
