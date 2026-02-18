import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { Dropdown } from "../../../src/components/disclosure/Dropdown";

describe("Dropdown 컴포넌트", () => {
  beforeEach(() => {
    // 뷰포트 크기 설정
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    vi.stubGlobal("scrollX", 0);
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("기본 동작", () => {
    it("open=true일 때 팝업이 렌더링된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div data-testid="content">팝업 내용</div>
          </Dropdown>
        </>
      ));

      // Portal로 body에 렌더링되므로 document.body에서 찾기
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("open=false일 때 팝업이 DOM에 없다", () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={false}>
            <div data-testid="content">팝업 내용</div>
          </Dropdown>
        </>
      ));

      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("data-dropdown 속성이 설정된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]");
        expect(dropdown).not.toBeNull();
      });
    });
  });

  describe("위치 계산", () => {
    it("triggerRef 모드: 트리거 요소 기준으로 위치가 설정된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button
            ref={(el) => (triggerRef = el)}
            style={{ position: "absolute", top: "100px", left: "200px", width: "100px" }}
          >
            트리거
          </button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown).not.toBeNull();
        // min-width가 트리거 너비로 설정되는지 확인
        expect(dropdown.style.minWidth).toBeTruthy();
      });
    });

    it("position 모드: 지정된 좌표에 위치가 설정된다", async () => {
      render(() => (
        <Dropdown position={{ x: 300, y: 200 }} open={true}>
          <div>컨텍스트 메뉴</div>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown).not.toBeNull();
        // fixed 포지션에서 좌표가 설정되는지 확인
        expect(dropdown.style.left).toBeTruthy();
        expect(dropdown.style.top).toBeTruthy();
      });
    });
  });

  describe("닫힘 감지", () => {
    it("팝업 외부 pointerdown 시 onOpenChange(false)가 호출된다", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <div data-testid="outside">외부 영역</div>
          <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      // 외부 영역 클릭
      const outside = document.querySelector('[data-testid="outside"]')!;
      fireEvent.pointerDown(outside);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("팝업 내부 클릭 시 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
            <div data-testid="inside">팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const inside = document.querySelector('[data-testid="inside"]')!;
      fireEvent.pointerDown(inside);

      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("Escape 키 입력 시 onOpenChange(false)가 호출된다", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("스크롤 발생 시 onOpenChange(false)가 호출된다", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      // 스크롤 이벤트 발생
      fireEvent.scroll(document);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Controlled/Uncontrolled 모드", () => {
    it("onOpenChange 없이 내부 상태로 동작한다 (Uncontrolled)", async () => {
      const [open, setOpen] = createSignal(true);
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)} onClick={() => setOpen(!open())}>
            트리거
          </button>
          <Dropdown triggerRef={() => triggerRef} open={open()}>
            <div data-testid="content">팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });

      // open() 상태 변경 시 반영됨
      setOpen(false);

      // Uncontrolled 모드에서는 애니메이션 후 DOM 제거
      // 즉시 사라지지 않고 transitionend 후 사라짐
    });
  });

  describe("maxHeight 속성", () => {
    it("maxHeight 기본값 300px이 적용된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("300px");
      });
    });

    it("maxHeight 커스텀 값이 적용된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true} maxHeight={500}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("500px");
      });
    });
  });

  describe("스타일링", () => {
    it("기본 스타일 클래스가 적용된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.classList.contains("bg-white")).toBe(true);
        expect(dropdown.classList.contains("shadow-lg")).toBe(true);
        expect(dropdown.classList.contains("rounded-md")).toBe(true);
        expect(dropdown.classList.contains("z-dropdown")).toBe(true);
      });
    });

    it("사용자 정의 class가 병합된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <Dropdown triggerRef={() => triggerRef} open={true} class="my-custom-class">
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.classList.contains("my-custom-class")).toBe(true);
        // 기본 스타일 유지
        expect(dropdown.classList.contains("shadow-lg")).toBe(true);
      });
    });
  });

  describe("애니메이션", () => {
    it("열림 시 애니메이션 클래스가 적용된다", async () => {
      let triggerRef: HTMLButtonElement;
      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)}>트리거</button>
          <Dropdown triggerRef={() => triggerRef} open={true}>
            <div>팝업 내용</div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown).not.toBeNull();
        // transition 클래스 확인
        expect(dropdown.classList.contains("transition-[opacity,transform]")).toBe(true);
        expect(dropdown.classList.contains("duration-150")).toBe(true);
      });
    });
  });

  describe("키보드 핸들링", () => {
    it("direction=down일 때 트리거에서 ArrowDown으로 첫 아이템 포커스", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)} data-testid="trigger">
            트리거
          </button>
          <Dropdown
            triggerRef={() => triggerRef}
            open={true}
            onOpenChange={handleOpenChange}
            keyboardNav
          >
            <div data-testid="first-item" tabIndex={0}>
              첫 아이템
            </div>
            <div data-testid="second-item" tabIndex={0}>
              두 번째 아이템
            </div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      // 트리거에 포커스
      triggerRef!.focus();

      // ArrowDown 키 입력
      fireEvent.keyDown(triggerRef!, { key: "ArrowDown" });

      // 첫 아이템에 포커스 이동
      await waitFor(() => {
        const firstItem = document.querySelector('[data-testid="first-item"]');
        expect(document.activeElement).toBe(firstItem);
      });
    });

    it("direction=down일 때 첫 아이템에서 ArrowUp으로 트리거 포커스 후 닫기", async () => {
      const handleOpenChange = vi.fn();
      let triggerRef: HTMLButtonElement;

      render(() => (
        <>
          <button ref={(el) => (triggerRef = el)} data-testid="trigger">
            트리거
          </button>
          <Dropdown
            triggerRef={() => triggerRef}
            open={true}
            onOpenChange={handleOpenChange}
            keyboardNav
          >
            <div data-testid="first-item" tabIndex={0}>
              첫 아이템
            </div>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const firstItem = document.querySelector('[data-testid="first-item"]') as HTMLElement;
      firstItem.focus();

      // 첫 아이템에서 ArrowUp → 트리거 포커스
      fireEvent.keyDown(firstItem, { key: "ArrowUp" });

      await waitFor(() => {
        expect(document.activeElement).toBe(triggerRef);
      });

      // 트리거에서 ArrowUp → 닫기
      fireEvent.keyDown(triggerRef!, { key: "ArrowUp" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
