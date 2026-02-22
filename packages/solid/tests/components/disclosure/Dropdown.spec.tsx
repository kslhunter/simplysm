import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { Dropdown } from "../../../src/components/disclosure/Dropdown";

describe("Dropdown 컴포넌트", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    vi.stubGlobal("scrollX", 0);
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Trigger/Content 구조", () => {
    it("Trigger 클릭 시 Content가 렌더링된다", async () => {
      render(() => (
        <Dropdown>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업 내용</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      const trigger = document.querySelector('[data-testid="trigger"]')!;
      expect(document.querySelector('[data-testid="content"]')).toBeNull();

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
    });

    it("Trigger 재클릭 시 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown onOpenChange={handleOpenChange}>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      const trigger = document.querySelector('[data-testid="trigger"]')!;
      fireEvent.click(trigger);
      expect(handleOpenChange).toHaveBeenCalledWith(true);

      fireEvent.click(trigger);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("disabled 시 Trigger 클릭이 무시된다", () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown disabled onOpenChange={handleOpenChange}>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      fireEvent.click(document.querySelector('[data-testid="trigger"]')!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("Controlled 모드", () => {
    it("open prop으로 제어된다", async () => {
      const [open, setOpen] = createSignal(false);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      expect(document.querySelector('[data-testid="content"]')).toBeNull();

      setOpen(true);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
    });
  });

  describe("Context menu (Trigger 없음)", () => {
    it("position prop으로 위치가 설정된다", async () => {
      render(() => (
        <Dropdown position={{ x: 300, y: 200 }} open={true}>
          <Dropdown.Content>
            <div data-testid="content">메뉴</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown).not.toBeNull();
        expect(dropdown.style.left).toBeTruthy();
      });
    });
  });

  describe("닫힘 감지", () => {
    it("외부 pointerdown 시 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <>
          <div data-testid="outside">외부</div>
          <Dropdown open={true} onOpenChange={handleOpenChange}>
            <Dropdown.Trigger>
              <button>트리거</button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <div>팝업</div>
            </Dropdown.Content>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.pointerDown(document.querySelector('[data-testid="outside"]')!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("Escape 키로 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown open={true} onOpenChange={handleOpenChange}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("maxHeight", () => {
    it("기본값 300px", async () => {
      render(() => (
        <Dropdown open={true}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("300px");
      });
    });

    it("커스텀 값 적용", async () => {
      render(() => (
        <Dropdown open={true} maxHeight={500}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("500px");
      });
    });
  });
});
