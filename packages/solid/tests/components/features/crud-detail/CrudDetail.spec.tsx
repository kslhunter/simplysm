import { describe, it, expect } from "vitest";
import { type Accessor, type JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import type {
  CrudDetailToolsDef,
  CrudDetailBeforeDef,
  CrudDetailAfterDef,
} from "../../../../src/components/features/crud-detail/types";
import {
  CrudDetailTools,
  isCrudDetailToolsDef,
} from "../../../../src/components/features/crud-detail/CrudDetailTools";
import {
  CrudDetailBefore,
  isCrudDetailBeforeDef,
} from "../../../../src/components/features/crud-detail/CrudDetailBefore";
import {
  CrudDetailAfter,
  isCrudDetailAfterDef,
} from "../../../../src/components/features/crud-detail/CrudDetailAfter";
import { CrudDetail } from "../../../../src/components/features/crud-detail/CrudDetail";
import { ConfigContext, ConfigProvider } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { Topbar } from "../../../../src/components/layout/topbar/Topbar";
import { useTopbarActionsAccessor } from "../../../../src/components/layout/topbar/TopbarContext";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";

// Helper: extract actions accessor from TopbarContext
function ActionsReader(props: { onCapture: (actions: Accessor<JSX.Element | undefined>) => void }) {
  const actions = useTopbarActionsAccessor();
  props.onCapture(actions);
  return null;
}

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
  it("CrudDetailToolsDef type has __type field", () => {
    const def: CrudDetailToolsDef = {
      __type: "crud-detail-tools",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBeforeDef type has __type field", () => {
    const def: CrudDetailBeforeDef = {
      __type: "crud-detail-before",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfterDef type has __type field", () => {
    const def: CrudDetailAfterDef = {
      __type: "crud-detail-after",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-after");
  });
});

describe("CrudDetail sub-components", () => {
  it("CrudDetailTools: returns plain object and is identifiable by type guard", () => {
    const def = CrudDetailTools({
      children: <div>tools</div>,
    });

    expect(isCrudDetailToolsDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBefore: returns plain object and is identifiable by type guard", () => {
    const def = CrudDetailBefore({
      children: <div>before</div>,
    });

    expect(isCrudDetailBeforeDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfter: returns plain object and is identifiable by type guard", () => {
    const def = CrudDetailAfter({
      children: <div>after</div>,
    });

    expect(isCrudDetailAfterDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-after");
  });

  it("type guard: returns false for plain objects", () => {
    expect(isCrudDetailToolsDef({})).toBe(false);
    expect(isCrudDetailToolsDef(null)).toBe(false);
    expect(isCrudDetailBeforeDef("string")).toBe(false);
    expect(isCrudDetailAfterDef(42)).toBe(false);
  });
});

describe("CrudDetail rendering", () => {
  it("basic rendering: children are displayed after load", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("홍길동");
  });

  it("Save button is displayed in toolbar when submit is provided (page/control mode)", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Save");
  });

  it("Save button is absent when submit is not provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Save");
  });

  it("Delete button is displayed in toolbar when toggleDelete is provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Delete");
  });

  it("Refresh button is always displayed in toolbar", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Refresh");
  });

  it("toolbar is not displayed when editable=false", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          editable={false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Save");
    expect(container.textContent).toContain("Refresh");
  });

  it("Delete button is not displayed even with toggleDelete when deletable=false", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          toggleDelete={() => Promise.resolve(true)}
          deletable={false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Delete");
    expect(container.textContent).not.toContain("Restore");
  });

  it("Delete button is displayed when toggleDelete is provided and deletable is not set", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Delete");
  });

  it("modification info is displayed when lastModifiedAt/By is present", async () => {
    const { DateTime } = await import("@simplysm/core-common");

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Last modified");
    expect(container.textContent).toContain("관리자");
  });
});

describe("CrudDetail button layout by mode", () => {
  it("control mode: Save/Refresh/Delete are displayed in toolbar", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          toggleDelete={() => Promise.resolve(true)}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Save");
    expect(container.textContent).toContain("Refresh");
    expect(container.textContent).toContain("Delete");
  });

  it("control mode + editable=false: only Refresh is displayed", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          toggleDelete={() => Promise.resolve(true)}
          editable={false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Save");
    expect(container.textContent).toContain("Refresh");
    expect(container.textContent).not.toContain("Delete");
  });

  it("page mode: Save/Delete/Refresh are registered in topbar and not displayed in toolbar", async () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <Topbar.Container>
          <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
          <CrudDetail<TestData>
            load={() =>
              Promise.resolve({
                data: { id: 1, name: "홍길동" },
                info: { isNew: false, isDeleted: false },
              })
            }
            submit={() => Promise.resolve(true)}
            toggleDelete={() => Promise.resolve(true)}
          >
            {(ctx) => <div>{ctx.data.name}</div>}
          </CrudDetail>
        </Topbar.Container>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));

    // actions are registered in topbar
    expect(actionsAccessor()).toBeTruthy();

    // Save/Refresh/Delete should not be in toolbar area
    const toolbarArea = container.querySelector("[data-topbar-container]")!;

    // Only check content area, excluding topbar actions area
    const buttons = toolbarArea.querySelectorAll("button");
    const toolbarButtons = Array.from(buttons).filter(
      (btn) => !btn.closest("[data-topbar-actions]"),
    );
    const toolbarText = toolbarButtons.map((b) => b.textContent).join("");
    expect(toolbarText).not.toContain("Save");
    expect(toolbarText).not.toContain("Refresh");
    expect(toolbarText).not.toContain("Delete");
  });

  it("page mode + Tools: only tools are displayed in toolbar", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <Topbar.Container>
          <CrudDetail<TestData>
            load={() =>
              Promise.resolve({
                data: { id: 1, name: "홍길동" },
                info: { isNew: false, isDeleted: false },
              })
            }
            submit={() => Promise.resolve(true)}
          >
            {(ctx) => (
              <>
                <CrudDetail.Tools>
                  <button>커스텀도구</button>
                </CrudDetail.Tools>
                <div>{ctx.data.name}</div>
              </>
            )}
          </CrudDetail>
        </Topbar.Container>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("커스텀도구");
  });

  it("control mode + Tools: Save/Refresh and tools are both displayed in toolbar", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
          {(ctx) => (
            <>
              <CrudDetail.Tools>
                <button>커스텀도구</button>
              </CrudDetail.Tools>
              <div>{ctx.data.name}</div>
            </>
          )}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Save");
    expect(container.textContent).toContain("Refresh");
    expect(container.textContent).toContain("커스텀도구");
  });

  it("control mode + editable=false + Tools: only Refresh and tools are displayed", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          editable={false}
        >
          {(ctx) => (
            <>
              <CrudDetail.Tools>
                <button>커스텀도구</button>
              </CrudDetail.Tools>
              <div>{ctx.data.name}</div>
            </>
          )}
        </CrudDetail>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Save");
    expect(container.textContent).toContain("Refresh");
    expect(container.textContent).toContain("커스텀도구");
  });
});
