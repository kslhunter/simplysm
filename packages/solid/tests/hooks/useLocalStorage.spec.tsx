import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { useLocalStorage } from "../../src/hooks/useLocalStorage";
import { ConfigContext } from "../../src/providers/ConfigContext";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("초기값이 없으면 undefined를 반환한다", () => {
    let value: () => string | undefined;

    function TestComponent() {
      [value] = useLocalStorage<string>("test-key");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBeUndefined();
  });

  it("초기값을 제공하면 해당 값을 반환한다", () => {
    let value: () => string | undefined;

    function TestComponent() {
      [value] = useLocalStorage("test-key", "default");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBe("default");
  });

  it("localStorage에 기존 값이 있으면 해당 값을 반환한다", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value: () => string | undefined;

    function TestComponent() {
      [value] = useLocalStorage("test-key", "default");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBe("stored");
  });

  it("값을 설정하면 localStorage에 저장된다", () => {
    let value: () => string | undefined;
    let setValue: (v: string) => void;

    function TestComponent() {
      [value, setValue] = useLocalStorage<string>("test-key");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue("new-value");
    expect(value()).toBe("new-value");
    expect(localStorage.getItem("testApp.test-key")).toBe(JSON.stringify("new-value"));
  });

  it("값을 undefined로 설정하면 localStorage에서 제거된다", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value: () => string | undefined;
    let setValue: (v: string | undefined) => void;

    function TestComponent() {
      [value, setValue] = useLocalStorage<string>("test-key");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBe("stored");

    setValue(undefined);
    expect(value()).toBeUndefined();
    expect(localStorage.getItem("testApp.test-key")).toBeNull();
  });

  it("다른 키는 독립적으로 동작한다", () => {
    let value1: () => string | undefined;
    let setValue1: (v: string) => void;
    let value2: () => string | undefined;
    let setValue2: (v: string) => void;

    function TestComponent() {
      [value1, setValue1] = useLocalStorage<string>("key1");
      [value2, setValue2] = useLocalStorage<string>("key2");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue1("value1");
    setValue2("value2");

    expect(value1()).toBe("value1");
    expect(value2()).toBe("value2");
  });

  it("복잡한 객체를 저장하고 읽을 수 있다", () => {
    let value: () => { name: string; count: number } | undefined;
    let setValue: (v: { name: string; count: number }) => void;

    function TestComponent() {
      [value, setValue] = useLocalStorage<{ name: string; count: number }>("test-key");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    const obj = { name: "test", count: 42 };
    setValue(obj);
    expect(value()).toEqual(obj);
    expect(localStorage.getItem("testApp.test-key")).toBe(JSON.stringify(obj));
  });

  it("잘못된 JSON은 초기값으로 대체된다", () => {
    localStorage.setItem("testApp.test-key", "invalid-json");

    let value: () => string | undefined;

    function TestComponent() {
      [value] = useLocalStorage("test-key", "default");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBe("default");
  });

  it("같은 키로 여러 훅을 생성하면 독립적인 시그널을 갖는다", () => {
    let value1: () => string | undefined;
    let setValue1: (v: string) => void;
    let value2: () => string | undefined;

    function TestComponent() {
      [value1, setValue1] = useLocalStorage("test-key", "initial");
      [value2] = useLocalStorage("test-key", "initial");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    // 초기값은 같음
    expect(value1()).toBe("initial");
    expect(value2()).toBe("initial");

    // 하나를 변경하면 localStorage는 업데이트되지만 다른 시그널은 변경되지 않음
    setValue1("changed");
    expect(value1()).toBe("changed");
    expect(value2()).toBe("initial"); // 여전히 초기값
  });

  it("clientName으로 키가 prefix된다", () => {
    let setValue: (v: string) => void;

    function TestComponent() {
      [, setValue] = useLocalStorage<string>("my-key");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "myApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue("hello");
    expect(localStorage.getItem("myApp.my-key")).toBe(JSON.stringify("hello"));
    expect(localStorage.getItem("my-key")).toBeNull();
  });
});
