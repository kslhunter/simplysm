import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Button } from "../../../src/components/controls/button";

describe("Button", () => {
  describe("클릭 동작", () => {
    it("클릭하면 onClick 핸들러가 호출된다", () => {
      const handleClick = vi.fn();

      render(() => <Button onClick={handleClick}>클릭</Button>);

      fireEvent.click(screen.getByRole("button", { name: "클릭" }));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 상태에서 클릭해도 onClick이 호출되지 않는다", () => {
      const handleClick = vi.fn();

      render(() => (
        <Button disabled onClick={handleClick}>
          비활성화
        </Button>
      ));

      fireEvent.click(screen.getByRole("button", { name: "비활성화" }));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("렌더링", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Button>테스트 버튼</Button>);

      expect(screen.getByRole("button", { name: "테스트 버튼" })).toBeInTheDocument();
    });

    it("disabled 속성이 적용된다", () => {
      render(() => <Button disabled>비활성화</Button>);

      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
