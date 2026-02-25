import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../../../src/components/form-control/Button";

describe("Button 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 버튼 내부에 표시된다", () => {
      const { getByRole } = render(() => <Button>Click Me</Button>);
      const button = getByRole("button");

      expect(button.textContent).toBe("Click Me");
    });

    it("type 속성 기본값은 button이다", () => {
      const { getByRole } = render(() => <Button>Click</Button>);
      const button = getByRole("button");

      expect(button.getAttribute("type")).toBe("button");
    });

    it("type 속성을 submit으로 오버라이드할 수 있다", () => {
      const { getByRole } = render(() => <Button type="submit">Submit</Button>);
      const button = getByRole("button");

      expect(button.getAttribute("type")).toBe("submit");
    });
  });

  describe("theme 속성", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getThemed } = render(() => <Button theme="danger">Click</Button>);

      expect(getDefault("button").className).not.toBe(getThemed("button").className);
    });
  });

  describe("variant 속성", () => {
    it("variant prop에 따라 스타일이 달라진다", () => {
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

  describe("size 속성", () => {
    it("size prop에 따라 스타일이 달라진다", () => {
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

  describe("inset 속성", () => {
    it("inset prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getInset } = render(() => <Button inset>Click</Button>);

      expect(getDefault("button").className).not.toBe(getInset("button").className);
    });
  });

  describe("disabled 속성", () => {
    it("disabled prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <Button>Click</Button>);
      const { getByRole: getDisabled } = render(() => <Button disabled>Click</Button>);

      expect(getDefault("button").className).not.toBe(getDisabled("button").className);
    });

    it("disabled=true일 때 HTML disabled 속성이 설정된다", () => {
      const { getByRole } = render(() => <Button disabled>Click</Button>);

      expect(getByRole("button").hasAttribute("disabled")).toBe(true);
    });
  });

  describe("이벤트 핸들링", () => {
    it("onClick handler가 버튼 클릭 시 호출된다", () => {
      const handleClick = vi.fn();
      const { getByRole } = render(() => <Button onClick={handleClick}>Click</Button>);

      fireEvent.click(getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 상태에서는 클릭이 차단된다", () => {
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
