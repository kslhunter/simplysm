import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach } from "vitest";
import { createSignal, Show } from "solid-js";
import { Topbar, createTopbarActions } from "../../../../src";

describe("Topbar.Actions 컴포넌트", () => {
  afterEach(() => {
    cleanup();
  });

  it("createTopbarActions로 등록한 내용이 Topbar.Actions 위치에 렌더링된다", () => {
    function PageWithActions() {
      createTopbarActions(() => <button>저장</button>);
      return <div>Page Content</div>;
    }

    const { getByText } = render(() => (
      <Topbar.Container>
        <Topbar>
          <span>타이틀</span>
          <Topbar.Actions />
        </Topbar>
        <PageWithActions />
      </Topbar.Container>
    ));

    expect(getByText("저장")).toBeTruthy();
  });

  it("actions가 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(() => (
      <Topbar.Container>
        <Topbar>
          <span>타이틀</span>
          <Topbar.Actions />
        </Topbar>
        <div>콘텐츠</div>
      </Topbar.Container>
    ));

    const actionsSlot = container.querySelector("[data-topbar-actions]");
    expect(actionsSlot?.childNodes.length ?? 0).toBe(0);
  });

  it("컴포넌트 전환 시 이전 actions가 해제되고 새 actions가 표시된다", () => {
    function PageA() {
      createTopbarActions(() => <button>저장</button>);
      return <div>Page A</div>;
    }

    function PageB() {
      createTopbarActions(() => <button>삭제</button>);
      return <div>Page B</div>;
    }

    const [page, setPage] = createSignal<"a" | "b">("a");

    const { getByText, queryByText } = render(() => (
      <Topbar.Container>
        <Topbar>
          <Topbar.Actions />
        </Topbar>
        <Show when={page() === "a"} fallback={<PageB />}>
          <PageA />
        </Show>
      </Topbar.Container>
    ));

    expect(getByText("저장")).toBeTruthy();
    expect(queryByText("삭제")).toBeNull();

    setPage("b");

    expect(queryByText("저장")).toBeNull();
    expect(getByText("삭제")).toBeTruthy();
  });
});
