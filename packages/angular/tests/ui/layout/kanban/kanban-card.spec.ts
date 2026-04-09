import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import { SdKanbanDragDropTest, SdKanbanSelectTest } from "./sd-kanban-test.fixture";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    ],
  });
}

describe("Feature 6.3 Slice 2: SdKanban", () => {
  // --- Acceptance Tests: 드래그 & 드롭 ---

  it("카드를 다른 레인의 카드 위로 드롭한다 — drop 이벤트가 정확한 값으로 발생하고 드래그 상태가 초기화된다", () => {
    setupTestBed(SdKanbanDragDropTest);
    const fixture = TestBed.createComponent(SdKanbanDragDropTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.componentInstance;
    const board = host.board();

    // 카드 컴포넌트 인스턴스 가져오기
    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];
    const cardB = kanbanEls[1];

    // 카드 A 드래그 시작
    cardA.querySelector(".card")!.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(board.dragKanban()).not.toBeUndefined();

    // 카드 B의 _drag-position 영역에 드래그오버 + 드롭
    const dragPosition = cardB.querySelector("._drag-position")!;
    dragPosition.dispatchEvent(
      new DragEvent("dragover", { bubbles: true, cancelable: true }),
    );
    dragPosition.dispatchEvent(
      new DragEvent("drop", { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(host.dropInfo).toEqual({
      sourceKanbanValue: "A",
      targetLaneValue: "lane2",
      targetKanbanValue: "B",
    });
    expect(board.dragKanban()).toBeUndefined();
  });

  it("드래그 중 시각적 피드백을 표시한다 — 원본 카드가 display:none이 되고 placeholder가 표시된다", () => {
    setupTestBed(SdKanbanDragDropTest);
    const fixture = TestBed.createComponent(SdKanbanDragDropTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];

    // 드래그 시작 전: display:none이 아님
    expect(cardA.getAttribute("data-sd-dragging-this")).not.toBe("true");

    // 카드 A 드래그 시작
    cardA.querySelector(".card")!.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // 원본 카드가 data-sd-dragging-this="true"로 설정되어 CSS로 display:none
    expect(cardA.getAttribute("data-sd-dragging-this")).toBe("true");
  });

  it("드래그를 취소하면 상태가 초기화된다 — document dragend 이벤트로 dragKanban이 undefined로 리셋된다", () => {
    setupTestBed(SdKanbanDragDropTest);
    const fixture = TestBed.createComponent(SdKanbanDragDropTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.componentInstance;
    const board = host.board();
    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];

    // 드래그 시작
    cardA.querySelector(".card")!.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(board.dragKanban()).not.toBeUndefined();

    // document dragend 이벤트
    document.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(board.dragKanban()).toBeUndefined();
  });

  // --- Acceptance Tests: Shift+Click 선택/해제 ---

  it("selectable 카드를 Shift+클릭하여 선택한다", () => {
    setupTestBed(SdKanbanSelectTest);
    const fixture = TestBed.createComponent(SdKanbanSelectTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.componentInstance;
    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];

    cardA.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(host.selectedValues).toContain("A");
  });

  it("선택된 카드를 Shift+클릭하여 해제한다", () => {
    setupTestBed(SdKanbanSelectTest);
    const fixture = TestBed.createComponent(SdKanbanSelectTest);
    fixture.componentInstance.selectedValues = ["A"];
    fixture.detectChanges();
    TestBed.flushEffects();

    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];

    cardA.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.selectedValues).not.toContain("A");
  });

  it("selectable=false 카드에 Shift+클릭하면 무시된다", () => {
    setupTestBed(SdKanbanSelectTest);
    const fixture = TestBed.createComponent(SdKanbanSelectTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardD = kanbanEls[3]; // selectable=false

    cardD.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.selectedValues).toEqual([]);
  });

  it("value가 없는 카드에 Shift+클릭하면 무시된다", () => {
    setupTestBed(SdKanbanSelectTest);
    const fixture = TestBed.createComponent(SdKanbanSelectTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardNoValue = kanbanEls[2]; // value=undefined

    cardNoValue.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.selectedValues).toEqual([]);
  });
});
