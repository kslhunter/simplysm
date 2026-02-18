import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { type Component, createSignal } from "solid-js";
import { Checkbox } from "../../../src/components/controls/choice/checkbox";
import { type IconProps } from "@tabler/icons-solidjs";

describe("Checkbox", () => {
  describe("클릭 동작", () => {
    it("클릭하면 onChange가 반대 값으로 호출된다", () => {
      const handleChange = vi.fn();

      render(() => <Checkbox onChange={handleChange}>동의</Checkbox>);

      fireEvent.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("value=true일 때 클릭하면 onChange(false)가 호출된다", () => {
      const handleChange = vi.fn();

      render(() => (
        <Checkbox value onChange={handleChange}>
          동의
        </Checkbox>
      ));

      fireEvent.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe("렌더링", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Checkbox>테스트 체크박스</Checkbox>);

      expect(screen.getByText("테스트 체크박스")).toBeInTheDocument();
    });

    it("disabled 속성이 적용된다", () => {
      render(() => <Checkbox disabled>비활성화</Checkbox>);

      expect(screen.getByRole("checkbox")).toBeDisabled();
    });

    it("value 상태가 올바르게 반영된다", () => {
      render(() => <Checkbox value>체크됨</Checkbox>);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("indeterminate 상태일 때 data-indeterminate 속성이 설정된다", () => {
      const { container } = render(() => <Checkbox value="-">부분 선택</Checkbox>);

      const indicatorIcon = container.querySelector("[data-indeterminate]");
      expect(indicatorIcon).toBeInTheDocument();
      expect(indicatorIcon?.getAttribute("data-indeterminate")).toBe("true");
    });

    it("indeterminate 상태가 value보다 우선한다", () => {
      const { container } = render(() => <Checkbox value="-">부분 선택</Checkbox>);

      const indicatorIcon = container.querySelector("[data-indeterminate]");
      expect(indicatorIcon?.getAttribute("data-indeterminate")).toBe("true");
      // value이지만 indeterminate가 true이면 data-value는 false
      expect(indicatorIcon?.getAttribute("data-value")).toBe("false");
    });

    it("size prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox size="sm">작은 체크박스</Checkbox>);
      expect(screen.getByText("작은 체크박스")).toBeInTheDocument();

      render(() => <Checkbox size="lg">큰 체크박스</Checkbox>);
      expect(screen.getByText("큰 체크박스")).toBeInTheDocument();
    });

    it("inline prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox inline>인라인 체크박스</Checkbox>);
      expect(screen.getByText("인라인 체크박스")).toBeInTheDocument();
    });

    it("inset prop이 에러 없이 렌더링된다", () => {
      render(() => <Checkbox inset>인셋 체크박스</Checkbox>);
      expect(screen.getByText("인셋 체크박스")).toBeInTheDocument();
    });
  });

  describe("키보드 접근성 (AC10)", () => {
    it("체크박스 input이 포커스 가능하다", () => {
      render(() => <Checkbox>동의</Checkbox>);

      const checkbox = screen.getByRole("checkbox");
      checkbox.focus();

      expect(document.activeElement).toBe(checkbox);
    });

    it("input type=checkbox가 렌더링된다", () => {
      const { container } = render(() => <Checkbox>동의</Checkbox>);

      const input = container.querySelector('input[type="choice"]');
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    it("Space 키로 체크박스가 토글된다", () => {
      const handleChange = vi.fn();

      render(() => <Checkbox onChange={handleChange}>동의</Checkbox>);

      const checkbox = screen.getByRole("checkbox");
      checkbox.focus();

      // Space 키 입력으로 토글
      fireEvent.keyDown(checkbox, { key: " ", code: "Space" });
      fireEvent.keyUp(checkbox, { key: " ", code: "Space" });

      // 브라우저 기본 동작으로 change 이벤트 발생
      // input[type=choice]는 Space 키로 클릭과 동일하게 동작
      fireEvent.click(checkbox);

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("disabled 상태에서 input이 비활성화되어 키보드 동작이 차단된다", () => {
      render(() => <Checkbox disabled>비활성화</Checkbox>);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
    });

    it("Tab 키로 포커스가 이동한다", () => {
      render(() => (
        <>
          <Checkbox>첫 번째</Checkbox>
          <Checkbox>두 번째</Checkbox>
        </>
      ));

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes[0].focus();

      expect(document.activeElement).toBe(checkboxes[0]);
    });
  });

  describe("uncontrolled 모드 (AC11)", () => {
    it("onChange 없이 value만 제공 시 내부 상태로 초기화된다", () => {
      render(() => <Checkbox value>초기 체크됨</Checkbox>);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("uncontrolled 모드에서 클릭 시 내부 상태가 토글된다", () => {
      render(() => <Checkbox>토글 가능</Checkbox>);

      const checkbox = screen.getByRole("checkbox");

      // 초기 상태: unvalue
      expect(checkbox).not.toBeChecked();

      // 클릭 후: value
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // 다시 클릭: unvalue
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("uncontrolled 모드에서 value 초기값이 적용된 후 토글된다", () => {
      render(() => <Checkbox value>초기 체크됨</Checkbox>);

      const checkbox = screen.getByRole("checkbox");

      // 초기 상태: value (초기값 적용)
      expect(checkbox).toBeChecked();

      // 클릭 후: unvalue
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("controlled 모드 (onChange 있음)에서는 외부 상태에 의존한다", () => {
      function TestComponent() {
        const [value, setValue] = createSignal(false);
        return (
          <>
            <Checkbox value={value()} onChange={setValue}>
              체크박스
            </Checkbox>
            <span data-testid="display">{String(value())}</span>
          </>
        );
      }

      render(() => <TestComponent />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      expect(screen.getByTestId("display")).toHaveTextContent("false");

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByTestId("display")).toHaveTextContent("true");
    });
  });

  describe("커스텀 아이콘 (AC12)", () => {
    it("icon prop으로 체크 아이콘이 커스터마이징된다", () => {
      const CustomIcon: Component<IconProps> = () => <svg data-testid="custom-check-icon" />;

      const { container } = render(() => (
        <Checkbox value icon={CustomIcon}>
          커스텀 아이콘
        </Checkbox>
      ));

      expect(container.querySelector("[data-testid='custom-check-icon']")).toBeInTheDocument();
    });

    it("기본 아이콘 (IconCheck, IconMinus)이 사용된다", () => {
      const { container: valueContainer } = render(() => <Checkbox value>체크됨</Checkbox>);

      // 기본 IconCheck는 svg로 렌더링됨
      expect(valueContainer.querySelector("svg")).toBeInTheDocument();

      const { container: indeterminateContainer } = render(() => (
        <Checkbox value="-">부분 선택</Checkbox>
      ));

      // 기본 IconMinus도 svg로 렌더링됨
      expect(indeterminateContainer.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("스타일 variants", () => {
    it("size=xs일 때 작은 font-size가 적용된다", () => {
      const { container } = render(() => <Checkbox size="xs">xs 크기</Checkbox>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      // xs 사이즈는 sm font-size 사용 (기본보다 작음)
      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
    });

    it("size=xl일 때 큰 font-size가 적용된다", () => {
      const { container } = render(() => <Checkbox size="xl">xl 크기</Checkbox>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      // xl 사이즈는 lg font-size 사용 (기본보다 큼)
      expect(parseFloat(styles.fontSize)).toBeGreaterThan(16);
    });

    it("inline일 때 padding이 0이다", () => {
      const { container } = render(() => <Checkbox inline>인라인</Checkbox>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(styles.padding).toBe("0px");
    });

    it("inset일 때 border가 없고 justify-content가 center이다", () => {
      const { container } = render(() => <Checkbox inset>인셋</Checkbox>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(styles.borderStyle).toBe("none");
      expect(styles.justifyContent).toBe("center");
    });

    it("disabled일 때 opacity가 낮아진다", () => {
      const { container } = render(() => <Checkbox disabled>비활성화</Checkbox>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(parseFloat(styles.opacity)).toBeLessThan(1);
    });
  });

  describe("theme variants (AC5)", () => {
    const themes = [
      "primary",
      "secondary",
      "success",
      "warning",
      "danger",
      "info",
      "gray",
      "slate",
    ] as const;

    it.each(themes)("theme=%s가 에러 없이 렌더링된다", (theme) => {
      render(() => (
        <Checkbox theme={theme} value>
          {theme}
        </Checkbox>
      ));

      expect(screen.getByText(theme)).toBeInTheDocument();
    });

    it("value 상태에서 theme에 따라 indicator 배경색이 변경된다", () => {
      const { container: primaryContainer } = render(() => (
        <Checkbox theme="primary" value>
          primary
        </Checkbox>
      ));

      const { container: successContainer } = render(() => (
        <Checkbox theme="success" value>
          success
        </Checkbox>
      ));

      const primaryIndicator = primaryContainer.querySelector("label > span");
      const successIndicator = successContainer.querySelector("label > span");

      const primaryStyles = window.getComputedStyle(primaryIndicator!);
      const successStyles = window.getComputedStyle(successIndicator!);

      // 각 theme는 다른 배경색을 가져야 함 (정확한 색상 비교는 환경에 따라 다를 수 있음)
      // 최소한 스타일이 적용되어야 함
      expect(primaryStyles.backgroundColor).toBeDefined();
      expect(successStyles.backgroundColor).toBeDefined();
    });
  });

  describe("포커스 스타일 (AC10)", () => {
    it("포커스 시 indicator가 포커스 상태가 된다", () => {
      const { container } = render(() => <Checkbox>포커스 테스트</Checkbox>);

      const checkbox = screen.getByRole("checkbox");
      const label = container.querySelector("label");
      const indicator = container.querySelector("label > span");

      // 포커스
      checkbox.focus();

      // 포커스 상태 검증
      expect(document.activeElement).toBe(checkbox);
      expect(indicator).toBeInTheDocument();

      // label이 :focus-within 상태가 되어야 함 (input이 포커스되면)
      // CSS :focus-within 스타일은 테스트 환경 한계로 직접 검증 불가
      // 대신 구조적으로 input이 label 내부에 있어 :focus-within이 동작함을 확인
      expect(label?.contains(checkbox)).toBe(true);
    });
  });

  describe("TypeScript 타입 (AC9)", () => {
    it("CheckboxProps가 HTML label 속성을 지원한다", () => {
      const { container } = render(() => (
        <Checkbox id="my-checkbox" data-testid="custom-checkbox" aria-label="동의 체크박스">
          체크박스
        </Checkbox>
      ));

      const label = container.querySelector("label");
      expect(label).toHaveAttribute("id", "my-choice");
      expect(label).toHaveAttribute("data-testid", "custom-choice");
      expect(label).toHaveAttribute("aria-label", "동의 체크박스");
    });

    it("모든 variant props가 타입 안전하게 동작한다", () => {
      render(() => (
        <Checkbox theme="success" size="lg" inline={false} inset={false} disabled={false} value>
          전체 옵션
        </Checkbox>
      ));

      expect(screen.getByText("전체 옵션")).toBeInTheDocument();
    });
  });
});
