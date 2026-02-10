import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ConfigContext } from "../../src/contexts/ConfigContext";
import { usePersisted } from "../../src/contexts/usePersisted";

describe("usePersisted", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("초기값이 올바르게 설정된다", () => {
    let capturedValue: string | undefined;

    function TestComponent() {
      const [value] = usePersisted("theme", "light");
      capturedValue = value();
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedValue).toBe("light");
  });

  it("clientName prefix가 localStorage 키에 적용된다", () => {
    function TestComponent() {
      const [, setValue] = usePersisted("theme", "light");
      setValue("dark");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "myApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(localStorage.getItem("myApp.theme")).toBe(JSON.stringify("dark"));
  });

  it("값 변경 시 localStorage에 저장된다", () => {
    let setValue: ((v: string) => void) | undefined;

    function TestComponent() {
      const [, setVal] = usePersisted("setting", "initial");
      setValue = setVal;
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue?.("updated");
    expect(localStorage.getItem("app.setting")).toBe(JSON.stringify("updated"));
  });

  it("다양한 타입을 지원한다", () => {
    function TestComponent() {
      const [, setNumber] = usePersisted("count", 0);
      const [, setObject] = usePersisted("data", { key: "value" });
      const [, setArray] = usePersisted("items", [1, 2, 3]);

      setNumber(42);
      setObject({ key: "updated" });
      setArray([4, 5, 6]);

      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(localStorage.getItem("app.count")).toBe(JSON.stringify(42));
    expect(localStorage.getItem("app.data")).toBe(JSON.stringify({ key: "updated" }));
    expect(localStorage.getItem("app.items")).toBe(JSON.stringify([4, 5, 6]));
  });

  it("ConfigContext.Provider 없이 사용하면 에러가 발생한다", () => {
    function TestComponent() {
      usePersisted("key", "value");
      return <div />;
    }

    expect(() => render(() => <TestComponent />)).toThrow(
      "useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다",
    );
  });

  it("커스텀 동기 저장소를 사용할 수 있다", () => {
    const store = new Map<string, string>();
    const customStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };

    let capturedValue: string | undefined;

    function TestComponent() {
      const [value, setValue] = usePersisted("theme", "light");
      capturedValue = value();
      setValue("dark");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", storage: customStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedValue).toBe("light");
    expect(store.get("app.theme")).toBe(JSON.stringify("dark"));
    expect(localStorage.getItem("app.theme")).toBeNull();
  });

  it("비동기 저장소 사용 시 loading이 true로 시작한다", () => {
    const store = new Map<string, string>();
    const asyncStorage = {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => { store.set(key, value); },
      removeItem: async (key: string) => { store.delete(key); },
    };

    let capturedLoading: boolean | undefined;
    let capturedValue: string | undefined;

    function TestComponent() {
      const [value, , loading] = usePersisted("theme", "light");
      capturedLoading = loading();
      capturedValue = value();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", storage: asyncStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedLoading).toBe(true);
    expect(capturedValue).toBe("light");
  });

  it("동기 저장소 사용 시 loading이 항상 false이다", () => {
    let capturedLoading: boolean | undefined;

    function TestComponent() {
      const [, , loading] = usePersisted("theme", "light");
      capturedLoading = loading();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedLoading).toBe(false);
  });
});
