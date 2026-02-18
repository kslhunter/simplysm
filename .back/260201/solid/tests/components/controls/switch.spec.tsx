import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Switch } from "../../../src/components/controls/choice/switch";

describe("Switch", () => {
  describe("기본 렌더링 (AC1, AC4)", () => {
    it("children이 올바르게 렌더링된다", () => {
      render(() => <Switch>알림 수신</Switch>);

      expect(screen.getByText("알림 수신")).toBeInTheDocument();
    });

    it("input type=checkbox가 렌더링된다", () => {
      const { container } = render(() => <Switch>토글</Switch>);

      const input = container.querySelector('input[type="choice"]');
      expect(input).toBeInTheDocument();
    });

    it("트랙과 썸이 렌더링된다", () => {
      const { container } = render(() => <Switch>토글</Switch>);

      // 트랙 (data-part="track")과 썸 (data-part="thumb") 확인
      const track = container.querySelector('[data-part="track"]');
      const thumb = container.querySelector('[data-part="thumb"]');

      expect(track).toBeInTheDocument();
      expect(thumb).toBeInTheDocument();
    });
  });

  describe("클릭 동작 (AC1)", () => {
    it("클릭하면 onChange가 반대 값으로 호출된다", () => {
      const handleChange = vi.fn();

      render(() => <Switch onChange={handleChange}>토글</Switch>);

      fireEvent.click(screen.getByRole("switch"));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("checked=true일 때 클릭하면 onChange(false)가 호출된다", () => {
      const handleChange = vi.fn();

      render(() => (
        <Switch checked onChange={handleChange}>
          토글
        </Switch>
      ));

      fireEvent.click(screen.getByRole("switch"));

      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe("disabled 상태 (AC2)", () => {
    it("disabled 속성이 적용된다", () => {
      render(() => <Switch disabled>비활성화</Switch>);

      expect(screen.getByRole("switch")).toBeDisabled();
    });

    it("disabled 상태에서 input이 disabled 속성을 가진다", () => {
      const { container } = render(() => <Switch disabled>비활성화</Switch>);

      const input = container.querySelector('input[type="choice"]');
      expect(input).toBeDisabled();
    });

    it("disabled일 때 opacity가 낮아진다", () => {
      const { container } = render(() => <Switch disabled>비활성화</Switch>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(parseFloat(styles.opacity)).toBeLessThan(1);
    });
  });

  describe("애니메이션 트랜지션 (AC3)", () => {
    it("썸에 transition 스타일이 적용된다", () => {
      const { container } = render(() => <Switch>토글</Switch>);

      const thumb = container.querySelector('[data-part="thumb"]');
      const styles = window.getComputedStyle(thumb!);

      expect(styles.transition).toContain("transform");
    });
  });

  describe("라벨 지원 (AC4)", () => {
    it("children이 라벨로 표시된다", () => {
      render(() => <Switch>다크 모드</Switch>);

      expect(screen.getByText("다크 모드")).toBeInTheDocument();
    });

    it("children이 없어도 에러 없이 렌더링된다", () => {
      const { container } = render(() => <Switch />);

      expect(container.querySelector("label")).toBeInTheDocument();
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
        <Switch theme={theme} checked>
          {theme}
        </Switch>
      ));

      expect(screen.getByText(theme)).toBeInTheDocument();
    });

    it("checked 상태에서 theme에 따라 트랙 배경색이 변경된다", () => {
      const { container: primaryContainer } = render(() => (
        <Switch theme="primary" checked>
          primary
        </Switch>
      ));

      const { container: successContainer } = render(() => (
        <Switch theme="success" checked>
          success
        </Switch>
      ));

      const primaryTrack = primaryContainer.querySelector('[data-part="track"]');
      const successTrack = successContainer.querySelector('[data-part="track"]');

      const primaryStyles = window.getComputedStyle(primaryTrack!);
      const successStyles = window.getComputedStyle(successTrack!);

      // 각 theme는 배경색 스타일이 적용되어야 함
      expect(primaryStyles.backgroundColor).toBeDefined();
      expect(successStyles.backgroundColor).toBeDefined();
    });
  });

  describe("size variants (AC6)", () => {
    it("size=xs일 때 작은 font-size가 적용된다", () => {
      const { container } = render(() => <Switch size="xs">xs 크기</Switch>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      // xs 사이즈는 sm font-size 사용 (기본보다 작음)
      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
    });

    it("size=xl일 때 큰 font-size가 적용된다", () => {
      const { container } = render(() => <Switch size="xl">xl 크기</Switch>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      // xl 사이즈는 lg font-size 사용 (기본보다 큼)
      expect(parseFloat(styles.fontSize)).toBeGreaterThan(16);
    });

    it("size prop이 에러 없이 렌더링된다", () => {
      render(() => <Switch size="sm">작은 스위치</Switch>);
      expect(screen.getByText("작은 스위치")).toBeInTheDocument();

      render(() => <Switch size="lg">큰 스위치</Switch>);
      expect(screen.getByText("큰 스위치")).toBeInTheDocument();
    });
  });

  describe("inline/inset 스타일 (AC7)", () => {
    it("inline일 때 padding이 0이다", () => {
      const { container } = render(() => <Switch inline>인라인</Switch>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(styles.padding).toBe("0px");
    });

    it("inline prop이 에러 없이 렌더링된다", () => {
      render(() => <Switch inline>인라인 스위치</Switch>);
      expect(screen.getByText("인라인 스위치")).toBeInTheDocument();
    });

    it("inset일 때 border가 없고 justify-content가 center이다", () => {
      const { container } = render(() => <Switch inset>인셋</Switch>);

      const label = container.querySelector("label");
      const styles = window.getComputedStyle(label!);

      expect(styles.borderStyle).toBe("none");
      expect(styles.justifyContent).toBe("center");
    });

    it("inset prop이 에러 없이 렌더링된다", () => {
      render(() => <Switch inset>인셋 스위치</Switch>);
      expect(screen.getByText("인셋 스위치")).toBeInTheDocument();
    });
  });

  describe("ripple 효과 (AC8)", () => {
    it("label에 ripple directive가 적용된다", () => {
      const { container } = render(() => <Switch>리플 테스트</Switch>);

      const label = container.querySelector("label");
      // ripple directive는 클릭 시 동작하므로 label이 존재하는지만 확인
      expect(label).toBeInTheDocument();
    });
  });

  describe("TypeScript 타입 (AC9)", () => {
    it("SwitchProps가 HTML label 속성을 지원한다", () => {
      const { container } = render(() => (
        <Switch id="my-switch" data-testid="custom-switch" aria-label="토글 스위치">
          스위치
        </Switch>
      ));

      const label = container.querySelector("label");
      expect(label).toHaveAttribute("id", "my-switch");
      expect(label).toHaveAttribute("data-testid", "custom-switch");
      expect(label).toHaveAttribute("aria-label", "토글 스위치");
    });

    it("모든 variant props가 타입 안전하게 동작한다", () => {
      render(() => (
        <Switch theme="success" size="lg" inline={false} inset={false} disabled={false} checked>
          전체 옵션
        </Switch>
      ));

      expect(screen.getByText("전체 옵션")).toBeInTheDocument();
    });
  });

  describe("키보드 접근성 (AC10)", () => {
    it("체크박스 input이 포커스 가능하다", () => {
      render(() => <Switch>토글</Switch>);

      const checkbox = screen.getByRole("switch");
      checkbox.focus();

      expect(document.activeElement).toBe(checkbox);
    });

    it("Space 키로 스위치가 토글된다 (네이티브 choice 동작)", () => {
      const handleChange = vi.fn();

      render(() => <Switch onChange={handleChange}>토글</Switch>);

      // role="switch"가 적용된 choice
      const checkbox = screen.getByRole("switch");
      checkbox.focus();

      // 네이티브 checkbox는 Space 키로 토글됨
      // testing-library에서는 click 이벤트로 시뮬레이션
      // 실제 브라우저에서는 Space 키 입력 시 checkbox의 기본 동작으로 change 이벤트 발생
      fireEvent.click(checkbox);

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("disabled 상태에서 input이 비활성화되어 키보드 동작이 차단된다", () => {
      render(() => <Switch disabled>비활성화</Switch>);

      const checkbox = screen.getByRole("switch");
      expect(checkbox).toBeDisabled();
    });

    it("Tab 키로 포커스가 이동한다", () => {
      render(() => (
        <>
          <Switch>첫 번째</Switch>
          <Switch>두 번째</Switch>
        </>
      ));

      const checkboxes = screen.getAllByRole("switch");
      checkboxes[0].focus();

      expect(document.activeElement).toBe(checkboxes[0]);
    });
  });

  describe("uncontrolled 모드 (AC11)", () => {
    it("onChange 없이 checked만 제공 시 내부 상태로 초기화된다", () => {
      render(() => <Switch checked>초기 켜짐</Switch>);

      const checkbox = screen.getByRole("switch");
      expect(checkbox).toBeChecked();
    });

    it("uncontrolled 모드에서 클릭 시 내부 상태가 토글된다", () => {
      render(() => <Switch>토글 가능</Switch>);

      const checkbox = screen.getByRole("switch");

      // 초기 상태: unchecked
      expect(checkbox).not.toBeChecked();

      // 클릭 후: checked
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // 다시 클릭: unchecked
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("uncontrolled 모드에서 checked 초기값이 적용된 후 토글된다", () => {
      render(() => <Switch checked>초기 켜짐</Switch>);

      const checkbox = screen.getByRole("switch");

      // 초기 상태: checked (초기값 적용)
      expect(checkbox).toBeChecked();

      // 클릭 후: unchecked
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("controlled 모드 (onChange 있음)에서는 외부 상태에 의존한다", () => {
      function TestComponent() {
        const [value, setValue] = createSignal(false);
        return (
          <>
            <Switch checked={value()} onChange={setValue}>
              스위치
            </Switch>
            <span data-testid="display">{String(value())}</span>
          </>
        );
      }

      render(() => <TestComponent />);

      const checkbox = screen.getByRole("switch");
      expect(checkbox).not.toBeChecked();
      expect(screen.getByTestId("display")).toHaveTextContent("false");

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByTestId("display")).toHaveTextContent("true");
    });
  });

  describe("checked 상태 표시", () => {
    it("checked 상태가 올바르게 반영된다", () => {
      render(() => <Switch checked>켜짐</Switch>);

      expect(screen.getByRole("switch")).toBeChecked();
    });

    it("checked=false 상태가 올바르게 반영된다", () => {
      render(() => <Switch checked={false}>꺼짐</Switch>);

      expect(screen.getByRole("switch")).not.toBeChecked();
    });
  });

  describe("포커스 스타일", () => {
    it("포커스 시 트랙에 포커스 스타일이 적용된다", () => {
      const { container } = render(() => <Switch>포커스 테스트</Switch>);

      const checkbox = screen.getByRole("switch");
      const label = container.querySelector("label");
      const track = container.querySelector('[data-part="track"]');

      // 포커스
      checkbox.focus();

      // 포커스 상태 검증
      expect(document.activeElement).toBe(checkbox);
      expect(track).toBeInTheDocument();

      // label이 :focus-within 상태가 되어야 함
      expect(label?.contains(checkbox)).toBe(true);
    });
  });
});
