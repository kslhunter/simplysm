import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { createPropSignal } from "../../src/utils/createPropSignal";

describe("createPropSignal hook", () => {
  describe("Controlled 모드 (onChange 제공)", () => {
    it("onChange가 제공될 때 setValue 호출 시 onChange가 호출된다", () => {
      const onChange = vi.fn();

      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => false,
          onChange: () => onChange,
        });

        expect(value()).toBe(false);

        setValue(true);

        expect(onChange).toHaveBeenCalledWith(true);
        dispose();
      });
    });

    it("onChange가 제공될 때 value()는 외부에서 제공한 값을 반환한다", () => {
      const onChange = vi.fn();
      let externalValue = false;

      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => externalValue,
          onChange: () => onChange,
        });

        expect(value()).toBe(false);

        // controlled 모드에서는 내부 상태가 변경되지 않음
        setValue(true);

        // 외부 값이 변경되지 않았으므로 여전히 false
        expect(value()).toBe(false);

        // 외부 값 변경 시뮬레이션
        externalValue = true;
        expect(value()).toBe(true);

        dispose();
      });
    });
  });

  describe("Uncontrolled 모드 (onChange 미제공)", () => {
    it("onChange가 없을 때 setValue 호출 시 내부 상태가 변경된다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => false,
          onChange: () => undefined,
        });

        expect(value()).toBe(false);

        setValue(true);

        expect(value()).toBe(true);
        dispose();
      });
    });

    it("onChange가 없을 때 초기값으로 value()가 설정된다", () => {
      createRoot((dispose) => {
        const [value] = createPropSignal({
          value: () => "initial",
          onChange: () => undefined,
        });

        expect(value()).toBe("initial");
        dispose();
      });
    });
  });

  describe("함수형 setter", () => {
    it("함수를 전달할 때 이전 값을 인자로 받아 새 값을 계산한다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => 5,
          onChange: () => undefined,
        });

        expect(value()).toBe(5);

        setValue((prev) => prev + 10);

        expect(value()).toBe(15);
        dispose();
      });
    });

    it("controlled 모드에서도 함수형 setter가 동작한다", () => {
      const onChange = vi.fn();

      createRoot((dispose) => {
        const [, setValue] = createPropSignal({
          value: () => 10,
          onChange: () => onChange,
        });

        setValue((prev: number) => prev * 2);

        expect(onChange).toHaveBeenCalledWith(20);
        dispose();
      });
    });

    it("토글 패턴이 올바르게 동작한다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => false,
          onChange: () => undefined,
        });

        expect(value()).toBe(false);

        setValue((v: boolean) => !v);
        expect(value()).toBe(true);

        setValue((v: boolean) => !v);
        expect(value()).toBe(false);

        dispose();
      });
    });
  });

  describe("다양한 타입 지원", () => {
    it("숫자 타입을 지원한다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => 0,
          onChange: () => undefined,
        });

        setValue(42);
        expect(value()).toBe(42);
        dispose();
      });
    });

    it("문자열 타입을 지원한다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => "hello",
          onChange: () => undefined,
        });

        setValue("world");
        expect(value()).toBe("world");
        dispose();
      });
    });

    it("객체 타입을 지원한다", () => {
      createRoot((dispose) => {
        const [value, setValue] = createPropSignal({
          value: () => ({ count: 0 }),
          onChange: () => undefined,
        });

        setValue({ count: 10 });
        expect(value()).toEqual({ count: 10 });
        dispose();
      });
    });

    it("함수를 객체로 감싸서 저장할 수 있다", () => {
      createRoot((dispose) => {
        const fn1 = () => "first";
        const fn2 = () => "second";

        const [value, setValue] = createPropSignal({
          value: () => ({ fn: fn1 }),
          onChange: () => undefined,
        });

        expect(value().fn()).toBe("first");

        setValue({ fn: fn2 });
        expect(value().fn()).toBe("second");

        dispose();
      });
    });
  });
});
