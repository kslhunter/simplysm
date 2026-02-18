import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal, type ParentComponent } from "solid-js";
import { Dropdown } from "../../../src/components/overlay/dropdown/dropdown";
import { DropdownPopup } from "../../../src/components/overlay/dropdown/dropdown-popup";
import { Button } from "../../../src/components/controls/button/button";

/**
 * 드롭다운 트리거(wrapper)를 찾는 헬퍼 함수
 * Dropdown wrapper가 role="button"과 aria-haspopup="menu"를 가지므로
 * 이를 사용하여 정확한 요소를 찾음
 */
const findTriggerByAriaHaspopup = () =>
  document.querySelector('[aria-haspopup="menu"]') as HTMLElement;

/**
 * 테스트용 controlled Dropdown 래퍼
 */
const TestDropdown: ParentComponent<{ "disabled"?: boolean; "data-testid"?: string }> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <Dropdown open={open()} onOpenChange={setOpen} disabled={props.disabled}>
      {props.children}
    </Dropdown>
  );
};

describe("Dropdown", () => {
  describe("열기/닫기", () => {
    it("트리거 클릭하면 팝업이 열린다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      // 초기: 팝업 닫힘
      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();

      // 클릭: 팝업 열림
      fireEvent.click(findTriggerByAriaHaspopup());

      expect(screen.getByText("팝업 내용")).toBeInTheDocument();
    });

    it("트리거 다시 클릭하면 팝업이 닫힌다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      const trigger = findTriggerByAriaHaspopup();

      // 열기
      fireEvent.click(trigger);
      expect(screen.getByText("팝업 내용")).toBeInTheDocument();

      // 닫기
      fireEvent.click(trigger);
      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();
    });

    it("ESC 키로 팝업이 닫힌다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      const trigger = findTriggerByAriaHaspopup();

      // 열기
      fireEvent.click(trigger);
      expect(screen.getByText("팝업 내용")).toBeInTheDocument();

      // ESC 키
      fireEvent.keyDown(trigger, { key: "Escape" });

      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();
    });

    it("외부 클릭하면 팝업이 닫힌다", () => {
      render(() => (
        <div>
          <TestDropdown>
            <Button>열기</Button>
            <DropdownPopup>팝업 내용</DropdownPopup>
          </TestDropdown>
          <div data-testid="outside">외부 영역</div>
        </div>
      ));

      // 열기
      fireEvent.click(findTriggerByAriaHaspopup());
      expect(screen.getByText("팝업 내용")).toBeInTheDocument();

      // 외부 클릭
      fireEvent.mouseDown(screen.getByTestId("outside"));

      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();
    });
  });

  describe("Controlled 모드", () => {
    it("open prop으로 열림 상태를 제어할 수 있다", () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown open={true} onOpenChange={handleOpenChange}>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </Dropdown>
      ));

      // 초기: open=true이므로 팝업 열려있음
      expect(screen.getByText("팝업 내용")).toBeInTheDocument();

      // 클릭하면 onOpenChange 호출
      fireEvent.click(findTriggerByAriaHaspopup());
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("키보드 네비게이션", () => {
    it("Space 키로 팝업을 토글한다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      const trigger = findTriggerByAriaHaspopup();

      // Space로 열기
      fireEvent.keyDown(trigger, { key: " " });
      expect(screen.getByText("팝업 내용")).toBeInTheDocument();

      // Space로 닫기
      fireEvent.keyDown(trigger, { key: " " });
      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();
    });
  });

  describe("disabled 상태", () => {
    it("disabled일 때 클릭해도 팝업이 열리지 않는다", () => {
      render(() => (
        <TestDropdown disabled>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      fireEvent.click(findTriggerByAriaHaspopup());

      expect(screen.queryByText("팝업 내용")).not.toBeInTheDocument();
    });
  });

  describe("메모리 관리", () => {
    it("빠른 열기/닫기 시에도 이벤트 리스너가 올바르게 정리된다", () => {
      const { unmount } = render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      const trigger = findTriggerByAriaHaspopup();

      // 빠른 열기/닫기 반복
      for (let i = 0; i < 10; i++) {
        fireEvent.click(trigger); // 열기
        fireEvent.click(trigger); // 닫기
      }

      // 컴포넌트 언마운트
      unmount();

      // 언마운트 후 scroll 이벤트가 발생해도 에러가 없어야 함
      // (이벤트 리스너가 정리되지 않았다면 에러 발생)
      expect(() => {
        window.dispatchEvent(new Event("scroll"));
      }).not.toThrow();
    });

    it("열린 상태에서 언마운트 시 Portal의 팝업이 정리된다", () => {
      const { unmount } = render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup data-testid="popup">팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      // 팝업 열기
      fireEvent.click(findTriggerByAriaHaspopup());
      expect(screen.getByTestId("popup")).toBeInTheDocument();

      // 언마운트
      unmount();

      // Portal로 렌더링된 팝업도 정리되어야 함
      expect(screen.queryByTestId("popup")).not.toBeInTheDocument();
    });
  });

  describe("접근성(a11y)", () => {
    it("트리거에 올바른 ARIA 속성이 설정된다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      const trigger = findTriggerByAriaHaspopup();

      // 닫힌 상태
      expect(trigger).toHaveAttribute("role", "button");
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      // 열기
      fireEvent.click(trigger);

      // 열린 상태
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("aria-controls");
    });

    it("팝업에 role=menu가 설정된다", () => {
      render(() => (
        <TestDropdown>
          <Button>열기</Button>
          <DropdownPopup>팝업 내용</DropdownPopup>
        </TestDropdown>
      ));

      fireEvent.click(findTriggerByAriaHaspopup());

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });
});
