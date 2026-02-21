import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach } from "vitest";
import { createSignal, type Accessor, type JSX } from "solid-js";
import { Topbar, createTopbarActions, useTopbarActionsAccessor } from "../../../../src";

// Helper: TopbarContext에서 actions accessor를 추출
function ActionsReader(props: { onCapture: (actions: Accessor<JSX.Element | undefined>) => void }) {
  const actions = useTopbarActionsAccessor();
  props.onCapture(actions);
  return null;
}

describe("createTopbarActions", () => {
  afterEach(() => {
    cleanup();
  });

  it("등록한 actions가 context를 통해 전달된다", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        <TestChild />
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>저장</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();
  });

  it("컴포넌트 언마운트 시 actions가 자동 해제된다", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;
    const [show, setShow] = createSignal(true);

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        {show() && <TestChild />}
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>저장</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();

    setShow(false);
    expect(actionsAccessor()).toBeUndefined();
  });

  it("TopbarContainer 없이 호출하면 에러가 발생한다", () => {
    expect(() => {
      render(() => {
        createTopbarActions(() => <button>저장</button>);
        return null;
      });
    }).toThrow();
  });
});
