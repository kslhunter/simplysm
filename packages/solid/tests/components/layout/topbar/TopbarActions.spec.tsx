import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createSignal, Show } from "solid-js";
import { Topbar, createTopbarActions } from "../../../../src";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Topbar.Actions component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders registered actions at Topbar.Actions position", () => {
    function PageWithActions() {
      createTopbarActions(() => <button>Save</button>);
      return <div>Page Content</div>;
    }

    const { getByText } = render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <Topbar.Container>
            <Topbar>
              <span>Title</span>
              <Topbar.Actions />
            </Topbar>
            <PageWithActions />
          </Topbar.Container>
        </I18nProvider>
      </ConfigProvider>
    ));

    expect(getByText("Save")).toBeTruthy();
  });

  it("renders nothing when actions are not provided", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <Topbar.Container>
            <Topbar>
              <span>Title</span>
              <Topbar.Actions />
            </Topbar>
            <div>Content</div>
          </Topbar.Container>
        </I18nProvider>
      </ConfigProvider>
    ));

    const actionsSlot = container.querySelector("[data-topbar-actions]");
    expect(actionsSlot?.childNodes.length ?? 0).toBe(0);
  });

  it("releases previous actions and displays new actions when switching components", () => {
    function PageA() {
      createTopbarActions(() => <button>Save</button>);
      return <div>Page A</div>;
    }

    function PageB() {
      createTopbarActions(() => <button>Delete</button>);
      return <div>Page B</div>;
    }

    const [page, setPage] = createSignal<"a" | "b">("a");

    const { getByText, queryByText } = render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <Topbar.Container>
            <Topbar>
              <Topbar.Actions />
            </Topbar>
            <Show when={page() === "a"} fallback={<PageB />}>
              <PageA />
            </Show>
          </Topbar.Container>
        </I18nProvider>
      </ConfigProvider>
    ));

    expect(getByText("Save")).toBeTruthy();
    expect(queryByText("Delete")).toBeNull();

    setPage("b");

    expect(queryByText("Save")).toBeNull();
    expect(getByText("Delete")).toBeTruthy();
  });
});
