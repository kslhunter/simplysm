import { beforeEach, describe, expect, it } from "vitest";
import { createRoot } from "solid-js";
import { useLocalConfig } from "../../src/hooks/useLocalConfig";

describe("useLocalConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("초기값이 없으면 undefined를 반환한다", () =>
    createRoot((dispose) => {
      const [value] = useLocalConfig<string>("test-key");
      expect(value()).toBeUndefined();
      dispose();
    }));

  it("초기값을 제공하면 해당 값을 반환한다", () =>
    createRoot((dispose) => {
      const [value] = useLocalConfig("test-key", "default");
      expect(value()).toBe("default");
      dispose();
    }));

  it("localStorage에 기존 값이 있으면 해당 값을 반환한다", () =>
    createRoot((dispose) => {
      localStorage.setItem("test-key", JSON.stringify("stored"));
      const [value] = useLocalConfig("test-key", "default");
      expect(value()).toBe("stored");
      dispose();
    }));

  it("값을 설정하면 localStorage에 저장된다", () =>
    createRoot((dispose) => {
      const [value, setValue] = useLocalConfig<string>("test-key");
      setValue("new-value");
      expect(value()).toBe("new-value");
      expect(localStorage.getItem("test-key")).toBe(JSON.stringify("new-value"));
      dispose();
    }));

  it("값을 undefined로 설정하면 localStorage에서 제거된다", () =>
    createRoot((dispose) => {
      localStorage.setItem("test-key", JSON.stringify("stored"));
      const [value, setValue] = useLocalConfig<string>("test-key");
      expect(value()).toBe("stored");

      setValue(undefined);
      expect(value()).toBeUndefined();
      expect(localStorage.getItem("test-key")).toBeNull();
      dispose();
    }));

  it("다른 키는 독립적으로 동작한다", () =>
    createRoot((dispose) => {
      const [value1, setValue1] = useLocalConfig<string>("key1");
      const [value2, setValue2] = useLocalConfig<string>("key2");

      setValue1("value1");
      setValue2("value2");

      expect(value1()).toBe("value1");
      expect(value2()).toBe("value2");
      dispose();
    }));

  it("복잡한 객체를 저장하고 읽을 수 있다", () =>
    createRoot((dispose) => {
      const [value, setValue] = useLocalConfig<{ name: string; count: number }>("test-key");
      const obj = { name: "test", count: 42 };

      setValue(obj);
      expect(value()).toEqual(obj);
      expect(localStorage.getItem("test-key")).toBe(JSON.stringify(obj));
      dispose();
    }));

  it("잘못된 JSON은 초기값으로 대체된다", () =>
    createRoot((dispose) => {
      localStorage.setItem("test-key", "invalid-json");
      const [value] = useLocalConfig("test-key", "default");
      expect(value()).toBe("default");
      dispose();
    }));

  it("같은 키로 여러 훅을 생성하면 독립적인 시그널을 갖는다", () =>
    createRoot((dispose) => {
      const [value1, setValue1] = useLocalConfig("test-key", "initial");
      const [value2, _setValue2] = useLocalConfig("test-key", "initial");

      // 초기값은 같음
      expect(value1()).toBe("initial");
      expect(value2()).toBe("initial");

      // 하나를 변경하면 localStorage는 업데이트되지만 다른 시그널은 변경되지 않음
      setValue1("changed");
      expect(value1()).toBe("changed");
      expect(value2()).toBe("initial"); // 여전히 초기값

      // 새로 생성한 훅은 localStorage의 값을 읽음
      const [value3] = useLocalConfig("test-key", "initial");
      expect(value3()).toBe("changed");

      dispose();
    }));
});
