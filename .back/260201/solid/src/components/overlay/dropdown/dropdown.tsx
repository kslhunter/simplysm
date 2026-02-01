import "@simplysm/core-common";
import {
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  type ParentComponent,
  splitProps,
} from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import { tabbable } from "tabbable";
import {
  DropdownContext,
  type DropdownInternalContextValue,
  useDropdownInternal,
} from "./dropdown-context";
import { dropdown } from "./dropdown.css";
import { MOBILE_BREAKPOINT_PX } from "../../../constants";

/**
 * Dropdown 컴포넌트의 props
 *
 * @property open - 열림 상태 (onOpenChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onOpenChange - 열림 상태 변경 콜백 (있으면 controlled 모드)
 * @property disabled - 비활성화 상태
 */
export interface DropdownProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: JSX.Element;
}

/**
 * 스크롤 가능한 부모 요소들을 찾아 반환
 */
const getScrollableParents = (element: HTMLElement): HTMLElement[] => {
  const scrollableParents: HTMLElement[] = [];
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;

    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowX === "auto" ||
      overflowX === "scroll"
    ) {
      scrollableParents.push(current);
    }
    current = current.parentElement;
  }

  return scrollableParents;
};

/**
 * 드롭다운 메뉴를 제공하는 컴포넌트
 *
 * 트리거 요소와 DropdownPopup을 children으로 받아
 * 클릭이나 키보드 조작으로 팝업을 열고 닫는다.
 *
 * - 중첩 사용 지원 (Menu 안에 서브메뉴 등)
 * - 뷰포트 기반 자동 포지셔닝
 * - 키보드 네비게이션 (ArrowDown, ArrowUp, Space, Escape)
 * - 모바일에서는 Bottom Sheet UI로 전환
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <Dropdown>
 *   <Button>메뉴</Button>
 *   <DropdownPopup>
 *     <List>
 *       <ListItem>옵션 1</ListItem>
 *       <ListItem>옵션 2</ListItem>
 *     </List>
 *   </DropdownPopup>
 * </Dropdown>
 *
 * // Controlled 모드
 * const [open, setOpen] = createSignal(false);
 * <Dropdown open={open()} onOpenChange={setOpen}>
 *   ...
 * </Dropdown>
 * ```
 */
export const Dropdown: ParentComponent<DropdownProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "open",
    "onOpenChange",
    "disabled",
    "children",
    "class",
  ]);

  const id = createUniqueId();
  const parentCtx = useDropdownInternal();

  // 자식 Dropdown ID 추적
  const [childIds, setChildIds] = createSignal<Set<string>>(new Set());

  const wrappedOnChange = () => {
    const fn = local.onOpenChange;
    return fn ? (v: boolean | undefined) => fn(v ?? false) : undefined;
  };

  const [openState, setOpenState] = createFieldSignal<boolean | undefined>({
    value: () => local.open,
    onChange: wrappedOnChange,
  });

  const isOpen = () => openState() ?? false;

  const setOpen = (val: boolean) => {
    if (local.disabled) return;
    setOpenState(val);
  };

  const openPopup = () => setOpen(true);
  const closePopup = () => setOpen(false);
  const togglePopup = () => setOpen(!isOpen());

  // 포지셔닝 상태
  const [placement, setPlacement] = createSignal<"top" | "bottom">("bottom");
  const [isMobile, setIsMobile] = createSignal(false);
  const [popupStyle, setPopupStyle] = createSignal<JSX.CSSProperties>({});

  let triggerRef!: HTMLDivElement;

  // 내부에 focusable 요소가 있는지 확인하여 wrapper의 tabIndex 결정
  const [hasFocusable, setHasFocusable] = createSignal(true);

  // placement 계산 (키보드 동작에 필요하므로 동기적으로 즉시 실행)
  const updatePlacement = () => {
    const checkMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;
    setIsMobile(checkMobile);

    if (!checkMobile) {
      const rect = triggerRef.getBoundingClientRect();
      const isPlaceTop = rect.top > window.innerHeight / 2;
      setPlacement(isPlaceTop ? "top" : "bottom");
    }
  };

  // 포지션 계산 (스타일 적용)
  const updatePosition = () => {
    const checkMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;

    if (checkMobile) {
      // 모바일: Bottom Sheet이므로 별도 포지셔닝 불필요
      setPopupStyle({});
      return;
    }

    const rect = triggerRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // 좌/우 공간 비교
    const isPlaceRight = rect.left > viewportWidth / 2;

    const style: JSX.CSSProperties = {
      "min-width": `${rect.width}px`,
    };

    if (placement() === "top") {
      style.bottom = `${viewportHeight - rect.top + 2}px`;
    } else {
      style.top = `${rect.bottom + 2}px`;
    }

    if (isPlaceRight) {
      style.right = `${viewportWidth - rect.right}px`;
    } else {
      style.left = `${rect.left}px`;
    }

    setPopupStyle(style);
  };

  // 팝업 열릴 때 포지션 계산 및 이벤트 등록
  createEffect(() => {
    if (isOpen()) {
      // 부모에게 등록
      parentCtx?.registerChild(id);

      // placement 즉시 계산 (키보드 동작에 필요)
      updatePlacement();

      const positionFrameId = requestAnimationFrame(() => {
        updatePosition();
      });

      // 스크롤/리사이즈 이벤트 등록
      const handleScroll = () => {
        updatePlacement();
        updatePosition();
      };

      const handleResize = () => {
        updatePlacement();
        updatePosition();
      };

      // 외부 클릭 감지
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // 트리거 내부 클릭은 무시 (onClick에서 처리)
        if (triggerRef.contains(target)) return;

        // 팝업 내부 클릭은 무시
        const popupEl = document.querySelector<HTMLElement>(`[data-dropdown-id="${id}"]`);
        if (popupEl?.contains(target)) return;

        // 자식 Dropdown 팝업 내부 클릭은 무시
        for (const childId of childIds()) {
          const childPopup = document.querySelector(`[data-dropdown-id="${childId}"]`);
          if (childPopup?.contains(target)) return;
        }

        // 외부 클릭 → 닫기
        closePopup();
      };

      // 스크롤 가능한 부모들에 이벤트 등록
      const scrollableParents = getScrollableParents(triggerRef);

      document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      for (const parent of scrollableParents) {
        parent.addEventListener("scroll", handleScroll, { passive: true });
      }
      window.addEventListener("resize", handleResize, { passive: true });
      document.addEventListener("mousedown", handleClickOutside);

      onCleanup(() => {
        cancelAnimationFrame(positionFrameId);
        document.removeEventListener("scroll", handleScroll, { capture: true });
        for (const parent of scrollableParents) {
          parent.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("mousedown", handleClickOutside);
        parentCtx?.unregisterChild(id);
      });
    }
  });

  // 마우스오버 추적 (blur 시 relatedTarget이 null인 경우 대비)
  let mouseoverEl: HTMLElement | undefined;
  const handleMouseOver = (e: MouseEvent) => {
    mouseoverEl = e.target as HTMLElement;
  };

  // 포커스 이탈 감지
  const handleBlurCapture = (e: FocusEvent) => {
    if (!isOpen()) return;

    const relatedTarget = e.relatedTarget as HTMLElement | null;

    // 트리거 내부인지 확인
    if (triggerRef.contains(relatedTarget)) {
      return;
    }

    // 팝업 또는 자손 Dropdown 내부인지 확인
    const popupEl = document.querySelector<HTMLElement>(`[data-dropdown-id="${id}"]`);
    if (popupEl?.contains(relatedTarget)) {
      return;
    }

    // 자손 Dropdown 팝업 내부인지 확인
    for (const childId of childIds()) {
      const childPopup = document.querySelector(`[data-dropdown-id="${childId}"]`);
      if (childPopup?.contains(relatedTarget)) {
        return;
      }
    }

    // relatedTarget이 null인 경우 (외부 클릭 등) mouseoverEl로 확인
    if (relatedTarget == null && mouseoverEl) {
      if (triggerRef.contains(mouseoverEl) || popupEl?.contains(mouseoverEl)) {
        // 포커스를 팝업 내 첫 요소로 이동
        const focusable = popupEl ? tabbable(popupEl)[0] : undefined;
        (focusable ?? popupEl)?.focus();
        return;
      }
    }

    // 외부로 포커스 이동 → 닫기
    closePopup();
  };

  // 키보드 핸들링
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey) return;

    // placement에 따라 방향키의 의미가 달라짐:
    // - bottom 배치: ArrowDown = 팝업 열기/내부 진입, ArrowUp = 팝업 닫기
    // - top 배치: ArrowUp = 팝업 열기/내부 진입, ArrowDown = 팝업 닫기
    // 이는 팝업이 열리는 방향으로 포커스가 이동하는 것이 자연스럽기 때문
    const isOpenKey =
      (e.key === "ArrowDown" && placement() === "bottom") ||
      (e.key === "ArrowUp" && placement() === "top");
    const isCloseKey =
      (e.key === "ArrowUp" && placement() === "bottom") ||
      (e.key === "ArrowDown" && placement() === "top");

    if (isOpenKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen()) {
        openPopup();
      } else {
        // 팝업 내 포커스 요소로 이동
        const popupEl = document.querySelector<HTMLElement>(`[data-dropdown-id="${id}"]`);
        const tabbables = popupEl ? tabbable(popupEl) : [];
        const targetFocusable = placement() === "top" ? tabbables.at(-1) : tabbables[0];
        targetFocusable?.focus();
      }
      return;
    }

    if (isCloseKey && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
      return;
    }

    switch (e.key) {
      case " ":
        e.preventDefault();
        e.stopPropagation();
        togglePopup();
        break;

      case "Escape":
        if (isOpen()) {
          e.preventDefault();
          e.stopPropagation();
          closePopup();
          triggerRef.focus();
        }
        break;
    }
  };

  // Context 값
  const contextValue: DropdownInternalContextValue = {
    id,
    parentId: parentCtx?.id,
    open: isOpen,
    close: closePopup,
    registerChild: (childId) => {
      setChildIds((prev) => new Set(prev).add(childId));
    },
    unregisterChild: (childId) => {
      setChildIds((prev) => {
        const next = new Set(prev);
        next.delete(childId);
        return next;
      });
    },
    isDescendant: (targetId) => childIds().has(targetId),
    placement,
    isMobile,
    popupStyle,
    focusTrigger: () => {
      // 내부의 첫번째 focusable 요소로 포커스, 없으면 wrapper로
      const focusable = tabbable(triggerRef)[0] as HTMLElement | undefined;
      if (focusable != null) {
        focusable.focus();
      } else {
        triggerRef.focus();
      }
    },
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      <div
        ref={(el) => {
          triggerRef = el;
          // blur 캡처 이벤트 등록
          el.addEventListener("blur", handleBlurCapture, true);
          onCleanup(() => el.removeEventListener("blur", handleBlurCapture, true));

          // 내부에 focusable 요소가 있는지 확인
          const focusableFrameId = requestAnimationFrame(() => {
            setHasFocusable(tabbable(el).length > 0);
          });
          onCleanup(() => cancelAnimationFrame(focusableFrameId));
        }}
        tabIndex={local.disabled ? -1 : hasFocusable() ? -1 : 0}
        role="button"
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        aria-controls={isOpen() ? `dropdown-popup-${id}` : undefined}
        aria-disabled={local.disabled || undefined}
        class={[dropdown, local.class].filter(Boolean).join(" ")}
        data-disabled={local.disabled}
        onClick={(e) => {
          e.stopPropagation();
          togglePopup();
        }}
        onKeyDown={handleKeyDown}
        onMouseOver={handleMouseOver}
        {...rest}
      >
        {local.children}
      </div>
    </DropdownContext.Provider>
  );
};
