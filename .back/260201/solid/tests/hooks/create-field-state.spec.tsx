import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { createFieldSignal } from "../../src/hooks/createFieldSignal";

describe("createFieldState", () => {
  describe("controlled 모드", () => {
    it("onChange가 있으면 controlled 모드로 동작한다", () => {
      const onChange = vi.fn();
      const ControlledComponent = () => {
        const [value, , isControlled] = createFieldSignal({
          value: () => "test",
          onChange: () => onChange,
        });
        return (
          <div>
            <span data-testid="controlled">{isControlled() ? "yes" : "no"}</span>
            <span data-testid="value">{value()}</span>
          </div>
        );
      };

      render(() => <ControlledComponent />);

      expect(screen.getByTestId("controlled")).toHaveTextContent("yes");
      expect(screen.getByTestId("value")).toHaveTextContent("test");
    });

    it("setValue 호출 시 onChange가 호출된다", () => {
      const onChange = vi.fn();
      const ControlledComponent = () => {
        const [, setValue] = createFieldSignal<string>({
          value: () => "initial",
          onChange: () => onChange,
        });
        return <button onClick={() => setValue("new value")}>변경</button>;
      };

      render(() => <ControlledComponent />);
      fireEvent.click(screen.getByRole("button", { name: "변경" }));

      expect(onChange).toHaveBeenCalledWith("new value");
    });

    it("외부 value 변경이 currentValue에 반영된다", () => {
      const ControlledComponent = () => {
        const [externalValue, setExternalValue] = createSignal("initial");
        const [value] = createFieldSignal({
          value: () => externalValue(),
          onChange: () => setExternalValue,
        });
        return (
          <div>
            <span data-testid="value">{value()}</span>
            <button onClick={() => setExternalValue("updated")}>외부 변경</button>
          </div>
        );
      };

      render(() => <ControlledComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("initial");

      fireEvent.click(screen.getByRole("button", { name: "외부 변경" }));

      expect(screen.getByTestId("value")).toHaveTextContent("updated");
    });
  });

  describe("uncontrolled 모드", () => {
    it("onChange가 없으면 uncontrolled 모드로 동작한다", () => {
      const UncontrolledComponent = () => {
        const [value, , isControlled] = createFieldSignal({
          value: () => "initial",
          onChange: () => undefined,
        });
        return (
          <div>
            <span data-testid="controlled">{isControlled() ? "yes" : "no"}</span>
            <span data-testid="value">{value()}</span>
          </div>
        );
      };

      render(() => <UncontrolledComponent />);

      expect(screen.getByTestId("controlled")).toHaveTextContent("no");
      expect(screen.getByTestId("value")).toHaveTextContent("initial");
    });

    it("setValue 호출 시 내부 상태가 변경된다", () => {
      const UncontrolledComponent = () => {
        const [value, setValue] = createFieldSignal<string>({
          value: () => "initial",
          onChange: () => undefined,
        });
        return (
          <div>
            <span data-testid="value">{value()}</span>
            <button onClick={() => setValue("updated")}>변경</button>
          </div>
        );
      };

      render(() => <UncontrolledComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("initial");

      fireEvent.click(screen.getByRole("button", { name: "변경" }));

      expect(screen.getByTestId("value")).toHaveTextContent("updated");
    });

    it("setValue(undefined) 호출이 정상 동작한다", () => {
      const UncontrolledComponent = () => {
        const [value, setValue] = createFieldSignal<string | undefined>({
          value: () => "initial",
          onChange: () => undefined,
        });
        return (
          <div>
            <span data-testid="value">{value() ?? "empty"}</span>
            <button onClick={() => setValue(undefined)}>초기화</button>
          </div>
        );
      };

      render(() => <UncontrolledComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("initial");

      fireEvent.click(screen.getByRole("button", { name: "초기화" }));

      expect(screen.getByTestId("value")).toHaveTextContent("empty");
    });
  });

  describe("제네릭 타입", () => {
    it("number 타입으로 동작한다", () => {
      const onChange = vi.fn();
      const NumberComponent = () => {
        const [value, setValue] = createFieldSignal<number>({
          value: () => 42,
          onChange: () => onChange,
        });
        return (
          <div>
            <span data-testid="value">{value()}</span>
            <button onClick={() => setValue(100)}>변경</button>
          </div>
        );
      };

      render(() => <NumberComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("42");

      fireEvent.click(screen.getByRole("button", { name: "변경" }));

      expect(onChange).toHaveBeenCalledWith(100);
    });

    it("object 타입으로 동작한다", () => {
      interface TestObj {
        name: string;
      }
      const onChange = vi.fn();
      const ObjectComponent = () => {
        const [value, setValue] = createFieldSignal<TestObj | undefined>({
          value: () => ({ name: "test" }),
          onChange: () => onChange,
        });
        return (
          <div>
            <span data-testid="value">{value()?.name}</span>
            <button onClick={() => setValue({ name: "updated" })}>변경</button>
          </div>
        );
      };

      render(() => <ObjectComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("test");

      fireEvent.click(screen.getByRole("button", { name: "변경" }));

      expect(onChange).toHaveBeenCalledWith({ name: "updated" });
    });
  });
});
