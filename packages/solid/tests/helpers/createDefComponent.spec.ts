import { describe, it, expect } from "vitest";
import { createDefComponent } from "../../src/helpers/createDefComponent";

describe("createDefComponent", () => {
  it("returns a component that casts definition object to JSX.Element", () => {
    const mockDef = {
      __type: "test-def",
      value: "test",
    };

    const transformer = () => mockDef;
    const Component = createDefComponent(transformer);
    const result = Component({}) as unknown as typeof mockDef;

    expect(result).toBe(mockDef);
  });

  it("preserves all properties in the returned definition object", () => {
    const mockDef = {
      __type: "test-def",
      value: "test",
      count: 42,
      nested: { inner: "value" },
      array: [1, 2, 3],
    };

    const transformer = () => mockDef;
    const Component = createDefComponent(transformer);
    const result = Component({}) as unknown as typeof mockDef;

    expect(result).toEqual(mockDef);
    expect(result.__type).toBe("test-def");
    expect(result.value).toBe("test");
    expect(result.count).toBe(42);
    expect(result.nested).toEqual({ inner: "value" });
    expect(result.array).toEqual([1, 2, 3]);
  });

  it("passes props to the transformer function", () => {
    const transformer = (props: any) => ({
      __type: "test-def",
      receivedProps: props,
    });

    const Component = createDefComponent(transformer);
    const testProps = { key: "value", foo: "bar" };
    const result = Component(testProps) as unknown as ReturnType<typeof transformer>;

    expect(result.receivedProps).toEqual(testProps);
  });

  it("works with generic type definitions", () => {
    interface TestDef {
      __type: "test";
      data: string;
      timestamp: number;
    }

    const transformer = (props: any): TestDef => ({
      __type: "test",
      data: props.value,
      timestamp: Date.now(),
    });

    const Component = createDefComponent<TestDef>(transformer);
    const now = Date.now();
    const result = Component({ value: "test-value" }) as unknown as TestDef;

    expect(result.__type).toBe("test");
    expect(result.data).toBe("test-value");
    expect(result.timestamp).toBeGreaterThanOrEqual(now);
  });
});
