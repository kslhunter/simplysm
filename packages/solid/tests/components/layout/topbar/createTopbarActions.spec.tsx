import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach } from "vitest";
import { createSignal, type Accessor, type JSX } from "solid-js";
import { Topbar, createTopbarActions, useTopbarActionsAccessor } from "../../../../src";

// Helper: Extract actions accessor from TopbarContext
function ActionsReader(props: { onCapture: (actions: Accessor<JSX.Element | undefined>) => void }) {
  const actions = useTopbarActionsAccessor();
  props.onCapture(actions);
  return null;
}

describe("createTopbarActions", () => {
  afterEach(() => {
    cleanup();
  });

  it("registered actions are passed through context", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        <TestChild />
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>Save</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();
  });

  it("actions are automatically released when component unmounts", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;
    const [show, setShow] = createSignal(true);

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        {show() && <TestChild />}
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>Save</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();

    setShow(false);
    expect(actionsAccessor()).toBeUndefined();
  });

  it("throws error when called without TopbarContainer", () => {
    expect(() => {
      render(() => {
        createTopbarActions(() => <button>Save</button>);
        return null;
      });
    }).toThrow();
  });
});
