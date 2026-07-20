import { DestroyRef, inject, type Signal } from "@angular/core";

export function injectSheetDragSelection<TItem>(options: {
  domAccessor: {
    getRows(): HTMLTableRowElement[];
    getContainer(): HTMLElement;
    getTHead(): HTMLTableSectionElement;
  };
  displayItems: Signal<TItem[]>;
  selection: {
    isSelected(item: TItem): boolean;
    getSelectable(item: TItem): true | string | undefined;
    select(item: TItem): void;
    deselect(item: TItem): void;
  };
}) {
  const destroyRef = inject(DestroyRef);

  let dragCleanup: (() => void) | null = null;

  destroyRef.onDestroy(() => {
    dragCleanup?.();
  });

  // 벗어난 1px 당 초당 스크롤 px, 그리고 초당 스크롤 상한
  const AUTO_SCROLL_SPEED_PER_PX = 8;
  const AUTO_SCROLL_MAX_SPEED = 2000;

  // 고정 헤더에 가려지거나 컨테이너 밖에 있는 행은 소비자에게 안 보인다
  function visibleBand(): { top: number; bottom: number } {
    const containerRect = options.domAccessor.getContainer().getBoundingClientRect();
    return {
      top: containerRect.top + options.domAccessor.getTHead().offsetHeight,
      bottom: containerRect.bottom,
    };
  }

  function rowIndexOf(rowEl: HTMLTableRowElement): number {
    const attr = rowEl.getAttribute("data-r");
    const rowIdx = attr == null ? Number.NaN : parseInt(attr, 10);
    if (Number.isNaN(rowIdx)) {
      throw new Error(`시트 행 인덱스를 읽을 수 없습니다: data-r=${attr}`);
    }
    return rowIdx;
  }

  // 보이는 행 중 clientY 가 속한 행. 위아래로 벗어나면 가장 가까운 끝 행으로 맞춘다
  function resolveRowIndex(clientY: number): number | null {
    const band = visibleBand();
    const visibleRows = options.domAccessor.getRows().filter((rowEl) => {
      const rect = rowEl.getBoundingClientRect();
      return rect.bottom > band.top && rect.top < band.bottom;
    });
    if (visibleRows.length === 0) return null;

    const firstRect = visibleRows[0].getBoundingClientRect();
    const lastRect = visibleRows[visibleRows.length - 1].getBoundingClientRect();
    if (clientY < Math.max(firstRect.top, band.top)) return rowIndexOf(visibleRows[0]);
    if (clientY >= Math.min(lastRect.bottom, band.bottom)) {
      return rowIndexOf(visibleRows[visibleRows.length - 1]);
    }

    for (const rowEl of visibleRows) {
      const rect = rowEl.getBoundingClientRect();
      if (clientY < rect.top || clientY >= rect.bottom) continue;
      return rowIndexOf(rowEl);
    }
    return null;
  }

  // 가장자리를 넘어선 거리. 위로 벗어나면 음수, 아래로 벗어나면 양수
  function overshootOf(clientY: number): number {
    const band = visibleBand();
    if (clientY < band.top) return clientY - band.top;
    if (clientY >= band.bottom) return clientY - band.bottom;
    return 0;
  }

  function onSelectorPointerDown(event: PointerEvent, r: number): void {
    if (event.button !== 0) return;
    if (event.shiftKey) return;
    if (event.pointerType === "touch") return;

    dragCleanup?.();

    const startItem = options.displayItems()[r];
    if (startItem == null) return;

    // 시작 행을 누른 결과 상태가 곧 페인트 목표. 체크박스 자체 토글보다 먼저 스냅샷해야 뒤집히지 않는다
    const isSelectTarget = !options.selection.isSelected(startItem);
    const startEl = event.currentTarget;
    let dragged = false;

    // 칠하기 전 상태. 드래그를 되돌려 범위를 벗어난 행은 이 값으로 복원한다
    const stateBeforePaint = new Map<number, boolean>();

    const setSelected = (rowIdx: number, selected: boolean): void => {
      const item = options.displayItems()[rowIdx];
      if (item == null) return;
      if (options.selection.getSelectable(item) !== true) return;

      if (selected) {
        options.selection.select(item);
      } else {
        options.selection.deselect(item);
      }
    };

    const paint = (rowIdx: number): void => {
      const item = options.displayItems()[rowIdx];
      if (item == null) return;
      if (options.selection.getSelectable(item) !== true) return;

      if (!stateBeforePaint.has(rowIdx)) {
        stateBeforePaint.set(rowIdx, options.selection.isSelected(item));
      }
      setSelected(rowIdx, isSelectTarget);
    };

    // 시작 행부터 현재 행까지가 칠할 범위. 범위를 벗어난 행은 원래대로 되돌린다
    const applyRange = (currentRow: number): void => {
      const from = Math.min(r, currentRow);
      const to = Math.max(r, currentRow);

      for (const rowIdx of [...stateBeforePaint.keys()]) {
        if (rowIdx >= from && rowIdx <= to) continue;
        setSelected(rowIdx, stateBeforePaint.get(rowIdx)!);
        stateBeforePaint.delete(rowIdx);
      }

      for (let i = from; i <= to; i++) {
        paint(i);
      }
    };

    const applyRangeAt = (clientY: number): void => {
      const rowIdx = resolveRowIndex(clientY);
      if (rowIdx == null) return;
      if (rowIdx === r && !dragged) return;

      dragged = true;
      applyRange(rowIdx);
    };

    // 가장자리를 넘긴 동안 벗어난 거리에 비례해 스크롤하며 계속 칠한다
    let pointerY = event.clientY;
    let rafId: number | null = null;
    let lastFrameTime: number | null = null;

    const autoScrollFrame = (time: number): void => {
      const overshoot = overshootOf(pointerY);
      if (overshoot === 0) {
        rafId = null;
        lastFrameTime = null;
        return;
      }

      const elapsedSec = lastFrameTime == null ? 0 : (time - lastFrameTime) / 1000;
      lastFrameTime = time;

      const speed =
        Math.sign(overshoot) *
        Math.min(Math.abs(overshoot) * AUTO_SCROLL_SPEED_PER_PX, AUTO_SCROLL_MAX_SPEED);
      options.domAccessor.getContainer().scrollTop += speed * elapsedSec;
      applyRangeAt(pointerY);

      rafId = requestAnimationFrame(autoScrollFrame);
    };

    const onPointerMove = (e: PointerEvent): void => {
      pointerY = e.clientY;
      applyRangeAt(pointerY);

      if (overshootOf(pointerY) !== 0 && rafId == null) {
        rafId = requestAnimationFrame(autoScrollFrame);
      }
    };

    const onPointerUp = (): void => {
      dragCleanup?.();
      if (!dragged) return;

      // 시작 행은 이미 페인트로 확정됐으므로 SdCheckbox 자체 토글이 되돌리지 못하게 막는다.
      // capture 로 걸어야 SdCheckbox 의 host (click) 보다 먼저 실행된다
      if (!(startEl instanceof HTMLElement)) return;

      const blockClick = (e: Event): void => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      startEl.addEventListener("click", blockClick, { once: true, capture: true });

      // 다른 행에서 뗀 드래그는 시작 체크박스에 click 이 오지 않는다.
      // 남겨두면 이후의 정상 클릭 1회를 삼키므로 이번 턴이 지나면 걷어낸다
      setTimeout(() => {
        startEl.removeEventListener("click", blockClick, { capture: true });
      });
    };

    // 드래그 중 브라우저 텍스트 선택 억제.
    // pointerdown 을 preventDefault 하면 클릭 포커스까지 사라져 shift 범위 선택의 기준 행이 깨지므로,
    // 선택 시작 자체만 막는다
    const blockSelectStart = (e: Event): void => {
      e.preventDefault();
    };
    document.addEventListener("selectstart", blockSelectStart);

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    // 브라우저발 강제 종료(창 전환, 시스템 제스처)도 뗀 것과 동일하게 확정 처리
    document.addEventListener("pointercancel", onPointerUp);
    dragCleanup = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener("selectstart", blockSelectStart);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      dragCleanup = null;
    };
  }

  return { onSelectorPointerDown };
}
