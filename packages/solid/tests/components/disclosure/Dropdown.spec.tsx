import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { Dropdown } from "../../../src/components/disclosure/Dropdown";

describe("Dropdown", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    vi.stubGlobal("scrollX", 0);
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Trigger/Content structure", () => {
    it("renders Content on Trigger click", async () => {
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

    it("closes on second Trigger click", () => {
      const [open, setOpen] = createSignal(false);
      const handleOpenChange = vi.fn((v: boolean) => setOpen(v));

      render(() => (
        <Dropdown open={open()} onOpenChange={handleOpenChange}>
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

    it("ignores Trigger click when disabled", () => {
      const [open, setOpen] = createSignal(false);
      const handleOpenChange = vi.fn((v: boolean) => setOpen(v));

      render(() => (
        <Dropdown disabled open={open()} onOpenChange={handleOpenChange}>
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

  describe("controlled mode", () => {
    it("is controlled by open prop", async () => {
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

  describe("Context menu (no Trigger)", () => {
    it("sets position via position prop", async () => {
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

  describe("close detection", () => {
    it("closes on outside pointerdown", async () => {
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

    it("closes on Escape key", async () => {
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
    it("defaults to 300px", async () => {
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

    it("applies custom value", async () => {
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

  describe("keyboardNav tabbable navigation", () => {
    it("ArrowDown from trigger focuses first tabbable in popup (input, not list item)", async () => {
      const [open, setOpen] = createSignal(true);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <button data-testid="trigger">trigger</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <input data-testid="search" />
            <button data-testid="action-btn" type="button">action</button>
            <button data-list-item data-testid="item1" type="button">item1</button>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const triggerWrapper = document.querySelector("[data-dropdown-trigger]") as HTMLElement;
      triggerWrapper.focus();

      fireEvent.keyDown(triggerWrapper, { key: "ArrowDown" });

      const search = document.querySelector('[data-testid="search"]') as HTMLElement;
      expect(document.activeElement).toBe(search);
    });

    it("ArrowDown from input focuses next tabbable (button)", async () => {
      const [open, setOpen] = createSignal(true);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <button data-testid="trigger">trigger</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <input data-testid="search" />
            <button data-testid="action-btn" type="button">action</button>
            <button data-list-item data-testid="item1" type="button">item1</button>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const search = document.querySelector('[data-testid="search"]') as HTMLElement;
      search.focus();

      const popup = document.querySelector("[data-dropdown]") as HTMLElement;
      fireEvent.keyDown(popup, { key: "ArrowDown" });

      const actionBtn = document.querySelector('[data-testid="action-btn"]') as HTMLElement;
      expect(document.activeElement).toBe(actionBtn);
    });

    it("ArrowUp from input focuses trigger (no prev tabbable, dir=down)", async () => {
      const [open, setOpen] = createSignal(true);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <button data-testid="trigger">trigger</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <input data-testid="search" />
            <button data-list-item data-testid="item1" type="button">item1</button>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const search = document.querySelector('[data-testid="search"]') as HTMLElement;
      search.focus();

      const popup = document.querySelector("[data-dropdown]") as HTMLElement;
      fireEvent.keyDown(popup, { key: "ArrowUp" });

      const triggerWrapper = document.querySelector("[data-dropdown-trigger]") as HTMLElement;
      expect(document.activeElement).toBe(triggerWrapper);
    });

    it("ArrowUp from action button focuses prev tabbable (input)", async () => {
      const [open, setOpen] = createSignal(true);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <button data-testid="trigger">trigger</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <input data-testid="search" />
            <button data-testid="action-btn" type="button">action</button>
            <button data-list-item data-testid="item1" type="button">item1</button>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const actionBtn = document.querySelector('[data-testid="action-btn"]') as HTMLElement;
      actionBtn.focus();

      const popup = document.querySelector("[data-dropdown]") as HTMLElement;
      fireEvent.keyDown(popup, { key: "ArrowUp" });

      const search = document.querySelector('[data-testid="search"]') as HTMLElement;
      expect(document.activeElement).toBe(search);
    });
  });
});
