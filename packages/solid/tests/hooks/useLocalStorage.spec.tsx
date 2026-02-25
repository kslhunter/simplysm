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

  it("returns undefined when no initial value is provided", () => {
    let value!: () => string | undefined;

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

  it("returns provided initial value", () => {
    let value!: () => string | undefined;

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

  it("returns existing value from localStorage if available", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value!: () => string | undefined;

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

  it("saves value to localStorage when set", () => {
    let value!: () => string | undefined;
    let setValue!: (v: string) => void;

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

  it("removes from localStorage when set to undefined", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value!: () => string | undefined;
    let setValue!: (v: string | undefined) => void;

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

  it("different keys work independently", () => {
    let value1!: () => string | undefined;
    let setValue1!: (v: string) => void;
    let value2!: () => string | undefined;
    let setValue2!: (v: string) => void;

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

  it("can store and read complex objects", () => {
    let value!: () => { name: string; count: number } | undefined;
    let setValue!: (v: { name: string; count: number }) => void;

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

  it("invalid JSON is replaced with initial value", () => {
    localStorage.setItem("testApp.test-key", "invalid-json");

    let value!: () => string | undefined;

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

  it("creates independent signals with same key", () => {
    let value1!: () => string | undefined;
    let setValue1!: (v: string) => void;
    let value2!: () => string | undefined;

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

    // Initial values are the same
    expect(value1()).toBe("initial");
    expect(value2()).toBe("initial");

    // Changing one updates localStorage but does not change the other signal
    setValue1("changed");
    expect(value1()).toBe("changed");
    expect(value2()).toBe("initial"); // Still initial value
  });

  it("key is prefixed with clientName", () => {
    let setValue!: (v: string) => void;

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
