import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../../../src/components/form-control/Button";

describe("Button component", () => {
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
});
