import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../../../src/components/form-control/Button";

describe("Button component", () => {
  describe("basic rendering", () => {
    it("renders children inside the button", () => {
      const { getByRole } = render(() => <Button>Click Me</Button>);
      const button = getByRole("button");

      expect(button.textContent).toBe("Click Me");
    });

    it("defaults type to button", () => {
      const { getByRole } = render(() => <Button>Click</Button>);
      const button = getByRole("button");

      expect(button.getAttribute("type")).toBe("button");
    });

    it("overrides type with submit", () => {
      const { getByRole } = render(() => <Button type="submit">Submit</Button>);
      const button = getByRole("button");

      expect(button.getAttribute("type")).toBe("submit");
    });
  });

  describe("theme prop", () => {
    it("applies different styles per theme", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getThemed } = render(() => <Button theme="danger">Click</Button>);

      expect(getDefault("button").className).not.toBe(getThemed("button").className);
    });
  });

  describe("variant prop", () => {
    it("applies different styles per variant", () => {
      const { getByRole: getOutline } = render(() => <Button>Click</Button>);
      const { getByRole: getSolid } = render(() => <Button variant="solid">Click</Button>);
      const { getByRole: getGhost } = render(() => <Button variant="ghost">Click</Button>);

      const outlineClass = getOutline("button").className;
      const solidClass = getSolid("button").className;
      const ghostClass = getGhost("button").className;

      expect(outlineClass).not.toBe(solidClass);
      expect(solidClass).not.toBe(ghostClass);
      expect(outlineClass).not.toBe(ghostClass);
    });
  });

  describe("size prop", () => {
    it("applies different styles per size", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getSm } = render(() => <Button size="sm">Click</Button>);
      const { getByRole: getLg } = render(() => <Button size="lg">Click</Button>);

      const defaultClass = getDefault("button").className;
      const smClass = getSm("button").className;
      const lgClass = getLg("button").className;

      expect(defaultClass).not.toBe(smClass);
      expect(defaultClass).not.toBe(lgClass);
      expect(smClass).not.toBe(lgClass);
    });
  });

  describe("inset prop", () => {
    it("applies different styles when inset", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getInset } = render(() => <Button inset>Click</Button>);

      expect(getDefault("button").className).not.toBe(getInset("button").className);
    });
  });

  describe("disabled prop", () => {
    it("applies different styles when disabled", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getDisabled } = render(() => <Button disabled>Click</Button>);

      expect(getDefault("button").className).not.toBe(getDisabled("button").className);
    });

    it("sets HTML disabled attribute when disabled=true", () => {
      const { getByRole } = render(() => <Button disabled>Click</Button>);

      expect(getByRole("button").hasAttribute("disabled")).toBe(true);
    });
  });

  describe("event handling", () => {
    it("calls onClick handler on click", () => {
      const handleClick = vi.fn();
      const { getByRole } = render(() => <Button onClick={handleClick}>Click</Button>);

      fireEvent.click(getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("blocks click when disabled", () => {
      const { getByRole } = render(() => <Button disabled>Click</Button>);

      expect(getByRole("button").hasAttribute("disabled")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <Button class="my-custom-class">Click</Button>);

      expect(getByRole("button").classList.contains("my-custom-class")).toBe(true);
    });
  });
});
