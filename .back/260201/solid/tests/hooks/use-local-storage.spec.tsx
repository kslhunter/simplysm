import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { useLocalStorage } from "../../src/hooks/useLocalStorage";
import { ConfigProvider } from "../../src/contexts/ConfigContext";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const TestComponent = (props: { storageKey: string; defaultValue: string }) => {
    const [value, setValue] = useLocalStorage(props.storageKey, props.defaultValue);
    return (
      <div>
        <span data-testid="value">{value()}</span>
        <button onClick={() => setValue("updated")}>변경</button>
      </div>
    );
  };

  it("기본값이 반환된다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <TestComponent storageKey="theme" defaultValue="light" />
      </ConfigProvider>
    ));

    expect(screen.getByTestId("value")).toHaveTextContent("light");
  });

  it("값을 변경하면 localStorage에 저장된다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <TestComponent storageKey="theme" defaultValue="light" />
      </ConfigProvider>
    ));

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(screen.getByTestId("value")).toHaveTextContent("updated");
    expect(localStorage.getItem("test-app:theme")).toBe("updated");
  });

  it("localStorage에 저장된 값이 있으면 해당 값을 사용한다", () => {
    localStorage.setItem("test-app:theme", "dark");

    render(() => (
      <ConfigProvider staticClientName="test-app">
        <TestComponent storageKey="theme" defaultValue="light" />
      </ConfigProvider>
    ));

    expect(screen.getByTestId("value")).toHaveTextContent("dark");
  });

  it("clientName이 prefix로 사용된다", () => {
    render(() => (
      <ConfigProvider staticClientName="my-custom-app">
        <TestComponent storageKey="setting" defaultValue="default" />
      </ConfigProvider>
    ));

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(localStorage.getItem("my-custom-app:setting")).toBe("updated");
  });

  it("localStorage에 유효하지 않은 값이 있으면 defaultValue를 사용한다", () => {
    // 외부에서 localStorage가 수정된 경우를 시뮬레이션
    // 빈 문자열은 유효하지 않은 값으로 처리
    localStorage.setItem("test-app:theme", "");

    render(() => (
      <ConfigProvider staticClientName="test-app">
        <TestComponent storageKey="theme" defaultValue="light" />
      </ConfigProvider>
    ));

    expect(screen.getByTestId("value")).toHaveTextContent("light");
  });

  it("validator가 제공되면 localStorage 값을 검증한다", () => {
    // 유효하지 않은 값 설정
    localStorage.setItem("test-app:theme", "invalid-theme");

    const ValidatedComponent = () => {
      const [value, setValue] = useLocalStorage<"light" | "dark">("theme", "light", {
        validator: (v) => v === "light" || v === "dark",
      });
      return (
        <div>
          <span data-testid="value">{value()}</span>
          <button onClick={() => setValue("dark")}>변경</button>
        </div>
      );
    };

    render(() => (
      <ConfigProvider staticClientName="test-app">
        <ValidatedComponent />
      </ConfigProvider>
    ));

    // validator가 실패하면 defaultValue 사용
    expect(screen.getByTestId("value")).toHaveTextContent("light");
  });
});
