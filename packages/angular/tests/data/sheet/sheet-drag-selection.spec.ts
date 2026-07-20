import { describe, it, expect, afterEach } from "vitest";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { injectSheetDragSelection } from "../../../src/data/sheet/injectSheetDragSelection";
import { SdSheet } from "../../../src/data/sheet/sd-sheet";
import { SdSheetColumn } from "../../../src/data/sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";

interface TestItem {
  id: number;
  selectable: boolean;
}

const ROW_HEIGHT = 20;

function createRow(r: number): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.setAttribute("data-r", String(r));
  tr.getBoundingClientRect = () =>
    ({
      top: r * ROW_HEIGHT,
      bottom: (r + 1) * ROW_HEIGHT,
      height: ROW_HEIGHT,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: r * ROW_HEIGHT,
      toJSON: () => ({}),
    });
  return tr;
}

function setup(options?: { items?: TestItem[]; selectedIds?: number[]; theadHeight?: number }) {
  const items =
    options?.items ??
    ([
      { id: 1, selectable: true },
      { id: 2, selectable: true },
      { id: 3, selectable: true },
      { id: 4, selectable: true },
    ] as TestItem[]);

  const selectedIds = new Set(options?.selectedIds ?? []);
  const rows = items.map((_, i) => createRow(i));

  const selection = {
    isSelected: (item: TestItem) => selectedIds.has(item.id),
    getSelectable: (item: TestItem): true | string | undefined =>
      item.selectable ? true : "선택 불가",
    select: (item: TestItem) => {
      selectedIds.add(item.id);
    },
    deselect: (item: TestItem) => {
      selectedIds.delete(item.id);
    },
  };

  // 컨테이너는 좌표를 고정해 행 좌표와 맞추고, 스크롤 위치는 값으로 추적한다
  const containerEl = document.createElement("div");
  let scrollTopValue = 0;
  Object.defineProperty(containerEl, "scrollTop", {
    get: () => scrollTopValue,
    set: (v: number) => {
      scrollTopValue = v;
    },
  });
  containerEl.getBoundingClientRect = () =>
    ({ top: 0, bottom: 1000, height: 1000, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON: () => ({}) });

  const theadEl = document.createElement("thead");
  Object.defineProperty(theadEl, "offsetHeight", { value: options?.theadHeight ?? 0 });

  let result!: ReturnType<typeof injectSheetDragSelection<TestItem>>;
  TestBed.runInInjectionContext(() => {
    result = injectSheetDragSelection<TestItem>({
      domAccessor: { getRows: () => rows, getContainer: () => containerEl, getTHead: () => theadEl },
      displayItems: signal(items),
      selection,
    });
  });

  // 실제 시트 구조와 동일하게 체크박스는 feature cell 안에 있다
  const cellEl = document.createElement("td");
  const checkboxEl = document.createElement("div");
  cellEl.appendChild(checkboxEl);

  function clickCheckbox(): boolean {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    checkboxEl.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function down(r: number, init?: PointerEventInit): boolean {
    checkboxEl.addEventListener(
      "pointerdown",
      (e) => result.onSelectorPointerDown(e, r),
      { once: true },
    );
    const event = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
      ...init,
    });
    checkboxEl.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function moveToRow(r: number) {
    document.dispatchEvent(
      new PointerEvent("pointermove", { clientY: r * ROW_HEIGHT + ROW_HEIGHT / 2 }),
    );
  }

  function up() {
    document.dispatchEvent(new PointerEvent("pointerup"));
  }

  function cancel() {
    document.dispatchEvent(new PointerEvent("pointercancel"));
  }

  function selectStart(): boolean {
    const event = new Event("selectstart", { bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function moveToY(clientY: number) {
    document.dispatchEvent(new PointerEvent("pointermove", { clientY }));
  }

  return {
    selectedIds,
    down,
    moveToRow,
    moveToY,
    up,
    cancel,
    clickCheckbox,
    selectStart,
    containerEl,
  };
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function frames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

afterEach(() => {
  TestBed.resetTestingModule();
});

describe("injectSheetDragSelection", () => {
  describe("Rule: 시작 행을 누른 결과 상태를 목표로 지나간 행에 칠한다", () => {
    it("시작 행이 미선택이면 지나간 행들이 선택된다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0);
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3]);
    });

    it("시작 행이 선택 상태면 지나간 행들이 해제된다", () => {
      const { selectedIds, down, moveToRow, up } = setup({ selectedIds: [1, 2, 3, 4] });

      down(0);
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds].sort()).toEqual([4]);
    });

    it("위로 끌어도 지나간 행이 칠해진다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(3);
      moveToRow(2);
      moveToRow(1);
      up();

      expect([...selectedIds].sort()).toEqual([2, 3, 4]);
    });

    it("포인터가 여러 행을 한 번에 건너뛰어도 사이의 행이 모두 칠해진다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0);
      moveToRow(3);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Rule: 드래그를 되돌리면 지나쳤던 행이 원래대로 복원된다", () => {
    it("아래로 끌었다가 되돌아오면 벗어난 행이 미선택으로 돌아간다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0);
      moveToRow(3);
      moveToRow(1);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2]);
    });

    it("복원은 드래그 시작 전 상태로 돌아간다", () => {
      const { selectedIds, down, moveToRow, up } = setup({ selectedIds: [3] });

      // 3행(id 3)은 원래 선택돼 있었다. 해제로 칠했다가 되돌아오면 다시 선택 상태여야 한다
      down(0);
      moveToRow(3);
      moveToRow(1);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3]);
    });

    it("시작 행을 지나 반대 방향으로 끌면 이전 방향이 복원되고 반대편이 칠해진다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(2);
      moveToRow(3);
      moveToRow(0);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3]);
    });

    it("시작 행으로 완전히 되돌아오면 시작 행만 남는다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0);
      moveToRow(3);
      moveToRow(0);
      up();

      expect([...selectedIds].sort()).toEqual([1]);
    });
  });

  describe("Rule: 선택 불가 행은 건너뛰고 계속 진행한다", () => {
    it("비활성 행은 칠하지 않고 그 다음 행은 칠한다", () => {
      const { selectedIds, down, moveToRow, up } = setup({
        items: [
          { id: 1, selectable: true },
          { id: 2, selectable: false },
          { id: 3, selectable: true },
          { id: 4, selectable: true },
        ],
      });

      down(0);
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds].sort()).toEqual([1, 3]);
    });

    it("해제 방향에서도 비활성 행은 그대로 남는다", () => {
      const { selectedIds, down, moveToRow, up } = setup({
        items: [
          { id: 1, selectable: true },
          { id: 2, selectable: false },
          { id: 3, selectable: true },
          { id: 4, selectable: true },
        ],
        selectedIds: [1, 2, 3, 4],
      });

      down(0);
      moveToRow(2);
      up();

      expect([...selectedIds].sort()).toEqual([2, 4]);
    });
  });

  describe("Rule: 드래그 중 브라우저 텍스트 선택이 일어나지 않는다", () => {
    it("추적 중에는 텍스트 선택 시작이 막힌다", () => {
      const { down, selectStart } = setup();

      down(0);

      expect(selectStart()).toBe(true);
    });

    it("추적이 끝나면 텍스트 선택이 다시 가능하다", () => {
      const { down, moveToRow, up, selectStart } = setup();

      down(0);
      moveToRow(1);
      up();

      expect(selectStart()).toBe(false);
    });

    it("페인트를 시작하지 않는 경우엔 텍스트 선택을 막지 않는다", () => {
      const { down, selectStart } = setup();

      down(0, { pointerType: "touch" });

      expect(selectStart()).toBe(false);
    });

    it("pointerdown 기본 동작은 막지 않는다 — 클릭 포커스가 유지돼야 shift 범위 선택의 기준 행이 남는다", () => {
      const { down } = setup();

      expect(down(0)).toBe(false);
    });
  });

  describe("Rule: 화면에 보이지 않는 행은 칠하지 않는다", () => {
    it("고정 헤더에 가려진 행 위로 끌어도 그 행은 칠해지지 않는다", () => {
      // 헤더 높이 40 — 행 0(y 0-20), 행 1(y 20-40)이 헤더 뒤에 가려진다
      const { selectedIds, down, moveToRow, up } = setup({ theadHeight: 40 });

      down(3);
      moveToRow(2);
      moveToRow(0);
      up();

      expect([...selectedIds].sort()).toEqual([3, 4]);
    });
  });

  describe("Rule: 가장자리를 넘기면 끝 행까지 이어서 칠한다", () => {
    it("아래로 크게 벗어나면 마지막 보이는 행까지 칠해진다", () => {
      const { selectedIds, down, moveToY, up } = setup();

      down(0);
      moveToY(5000);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3, 4]);
    });

    it("위로 크게 벗어나면 첫 보이는 행까지 범위가 늘어난다", () => {
      const { selectedIds, down, moveToY, up } = setup();

      down(2);
      moveToY(-500);
      up();

      expect([...selectedIds].sort()).toEqual([1, 2, 3]);
    });

    it("가장자리를 넘긴 동안 컨테이너가 스크롤된다", async () => {
      const { down, moveToY, up, containerEl } = setup();

      down(0);
      moveToY(5000);
      await frames(3);
      const scrolled = containerEl.scrollTop;
      up();

      expect(scrolled).toBeGreaterThan(0);
    });

    it("가장자리 안으로 돌아오면 스크롤이 멈춘다", async () => {
      const { down, moveToY, moveToRow, up, containerEl } = setup();

      down(0);
      moveToY(5000);
      await frames(3);
      moveToRow(1);
      await frames(2);

      const stopped = containerEl.scrollTop;
      await frames(3);
      up();

      expect(containerEl.scrollTop).toBe(stopped);
    });
  });

  describe("Rule: shift 와 터치에서는 페인트를 시작하지 않는다", () => {
    it("shift 를 누르고 있으면 드래그해도 아무 행도 칠해지지 않는다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0, { shiftKey: true });
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds]).toEqual([]);
    });

    it("주 버튼이 아니면 드래그해도 아무 행도 칠해지지 않는다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0, { button: 2 });
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds]).toEqual([]);
    });

    it("터치 포인터면 드래그해도 아무 행도 칠해지지 않는다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0, { pointerType: "touch" });
      moveToRow(1);
      moveToRow(2);
      up();

      expect([...selectedIds]).toEqual([]);
    });
  });

  describe("Rule: 뗀 시점에 칠해진 상태로 확정한다", () => {
    it("뗀 뒤 이동은 더 이상 선택을 바꾸지 않는다", () => {
      const { selectedIds, down, moveToRow, up } = setup();

      down(0);
      moveToRow(1);
      up();
      moveToRow(3);

      expect([...selectedIds].sort()).toEqual([1, 2]);
    });

    it("행을 넘어가지 않고 뗀 경우 시작 행도 바뀌지 않는다", () => {
      const { selectedIds, down, up } = setup();

      down(0);
      up();

      expect([...selectedIds]).toEqual([]);
    });

    it("브라우저가 드래그를 취소해도 칠해진 상태가 유지되고 추적이 끝난다", () => {
      const { selectedIds, down, moveToRow, cancel } = setup();

      down(0);
      moveToRow(1);
      cancel();
      moveToRow(3);

      expect([...selectedIds].sort()).toEqual([1, 2]);
    });

    it("드래그 직후의 click 은 차단된다 — 시작 행이 체크박스 토글로 되돌아가지 않게", () => {
      const { down, moveToRow, up, clickCheckbox } = setup();

      down(0);
      moveToRow(2);
      up();

      expect(clickCheckbox()).toBe(true);
    });

    it("드래그가 끝난 뒤의 다음 단일 클릭은 삼켜지지 않는다", async () => {
      const { down, moveToRow, up, clickCheckbox } = setup();

      down(0);
      moveToRow(2);
      up();
      await tick();

      expect(clickCheckbox()).toBe(false);
    });

    it("드래그하지 않고 뗀 경우 click 은 차단되지 않는다", () => {
      const { down, up, clickCheckbox } = setup();

      down(0);
      up();

      expect(clickCheckbox()).toBe(false);
    });
  });
});

interface DragRow {
  id: number;
  name: string;
}

@Component({
  selector: "sd-sheet-drag-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'multi'"
      [trackByFn]="trackByFn"
      [(selectedKeys)]="selectedKeys"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()" let-item>{{ item.name }}</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
class DragTest {
  items = signal<DragRow[]>([
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
    { id: 4, name: "D" },
  ]);
  selectedKeys = signal<number[]>([]);
  trackByFn = (item: DragRow) => item.id;
}

describe("SdSheet 드래그 페인트 선택 통합", () => {
  it("드래그로 칠한 시작 행이 체크박스 자체 토글로 되돌아가지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [DragTest] }).createComponent(
      DragTest,
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const checkboxes = hostEl.querySelectorAll<HTMLElement>(
      "tbody tr td._feature-cell sd-checkbox",
    );
    const rows = hostEl.querySelectorAll<HTMLElement>("tbody tr[data-r]");

    const centerY = (r: number) => {
      const rect = rows[r].getBoundingClientRect();
      return rect.top + rect.height / 2;
    };

    checkboxes[0].dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }),
    );
    document.dispatchEvent(new PointerEvent("pointermove", { clientY: centerY(2) }));
    document.dispatchEvent(new PointerEvent("pointerup"));

    // 브라우저가 드래그 종료 후 합성하는 click. 체크박스 host 자체가 타깃인 경우
    checkboxes[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect([...fixture.componentInstance.selectedKeys()].sort()).toEqual([1, 2, 3]);
  });

  it("드래그 없이 체크박스를 한 번 누르면 그 행만 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [DragTest] }).createComponent(
      DragTest,
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      "tbody tr td._feature-cell sd-checkbox",
    )!;

    checkbox.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }),
    );
    document.dispatchEvent(new PointerEvent("pointerup"));
    checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedKeys()).toEqual([1]);
  });

  it("드래그 뒤 다시 누르는 단일 클릭도 정상 토글된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [DragTest] }).createComponent(
      DragTest,
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const checkboxes = hostEl.querySelectorAll<HTMLElement>(
      "tbody tr td._feature-cell sd-checkbox",
    );
    const rows = hostEl.querySelectorAll<HTMLElement>("tbody tr[data-r]");
    const centerY = (r: number) => {
      const rect = rows[r].getBoundingClientRect();
      return rect.top + rect.height / 2;
    };

    // 1) 0행에서 2행까지 드래그
    checkboxes[0].dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }),
    );
    document.dispatchEvent(new PointerEvent("pointermove", { clientY: centerY(2) }));
    document.dispatchEvent(new PointerEvent("pointerup"));
    checkboxes[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    await new Promise((resolve) => setTimeout(resolve, 0));

    // 2) 이어서 3행 체크박스를 단순 클릭
    checkboxes[3].dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }),
    );
    document.dispatchEvent(new PointerEvent("pointerup"));
    checkboxes[3].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect([...fixture.componentInstance.selectedKeys()].sort()).toEqual([1, 2, 3, 4]);
  });
});
