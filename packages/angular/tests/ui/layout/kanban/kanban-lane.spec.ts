import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdKanbanLaneDropTest,
  SdKanbanLaneSelectAllTest,
  SdKanbanLaneNoSelectableTest,
  SdKanbanLaneCollapseTest,
  SdKanbanLaneNoCollapseTest,
} from "./sd-kanban-test.fixture";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    ],
  });
}

describe("Feature 6.3 Slice 3: SdKanbanLaneControl", () => {
  // --- 드롭 ---

  it("카드를 빈 레인 영역에 드롭한다 — targetKanbanValue가 undefined인 drop 이벤트가 발생한다", () => {
    setupTestBed(SdKanbanLaneDropTest);
    const fixture = TestBed.createComponent(SdKanbanLaneDropTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.componentInstance;
    const board = host.board();
    const kanbanEls = fixture.nativeElement.querySelectorAll("sd-kanban") as NodeListOf<HTMLElement>;
    const cardA = kanbanEls[0];
    const lanes = fixture.nativeElement.querySelectorAll("sd-kanban-lane") as NodeListOf<HTMLElement>;
    const lane2 = lanes[1];

    // 카드 A 드래그 시작
    cardA.querySelector("sd-card")!.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(board.dragKanban()).not.toBeUndefined();

    // 빈 레인에 드롭
    lane2.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
    lane2.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(host.dropInfo).toEqual({
      sourceKanbanValue: "A",
      targetLaneValue: "lane2",
      targetKanbanValue: undefined,
    });
  });

  // --- 전체선택 ---

  it("전체선택 체크박스로 레인 내 카드를 모두 선택한다", () => {
    setupTestBed(SdKanbanLaneSelectAllTest);
    const fixture = TestBed.createComponent(SdKanbanLaneSelectAllTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.componentInstance;
    const checkbox = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(checkbox).not.toBeNull();

    // 체크박스 클릭으로 전체 선택
    checkbox.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(host.selectedValues).toContain("X");
    expect(host.selectedValues).toContain("Y");
    expect(host.selectedValues).toContain("Z");
  });

  it("전체선택 체크박스로 레인 내 카드를 모두 해제한다", () => {
    setupTestBed(SdKanbanLaneSelectAllTest);
    const fixture = TestBed.createComponent(SdKanbanLaneSelectAllTest);
    fixture.componentInstance.selectedValues = ["X", "Y", "Z"];
    fixture.detectChanges();
    TestBed.flushEffects();

    const checkbox = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    checkbox.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.selectedValues).not.toContain("X");
    expect(fixture.componentInstance.selectedValues).not.toContain("Y");
    expect(fixture.componentInstance.selectedValues).not.toContain("Z");
  });

  it("selectable 카드가 없으면 전체선택 체크박스가 표시되지 않는다", () => {
    setupTestBed(SdKanbanLaneNoSelectableTest);
    const fixture = TestBed.createComponent(SdKanbanLaneNoSelectableTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const checkbox = fixture.nativeElement.querySelector("sd-checkbox");
    expect(checkbox).toBeNull();
  });

  // --- 접기/펼치기 ---

  it("useCollapse=true일 때 eye 아이콘 버튼 클릭으로 레인을 접는다", () => {
    setupTestBed(SdKanbanLaneCollapseTest);
    const fixture = TestBed.createComponent(SdKanbanLaneCollapseTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // 카드가 보이는 상태
    const kanban = fixture.nativeElement.querySelector("sd-kanban");
    expect(kanban).not.toBeNull();

    // 접기 버튼 클릭
    const anchor = fixture.nativeElement.querySelector("sd-anchor") as HTMLElement;
    expect(anchor).not.toBeNull();
    anchor.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.collapsed).toBe(true);
    // 접힌 상태에서는 ng-content가 렌더링되지 않음
    const kanbanAfter = fixture.nativeElement.querySelector("sd-kanban");
    expect(kanbanAfter).toBeNull();
  });

  it("접힌 레인을 펼친다", () => {
    setupTestBed(SdKanbanLaneCollapseTest);
    const fixture = TestBed.createComponent(SdKanbanLaneCollapseTest);
    fixture.componentInstance.collapsed = true;
    fixture.detectChanges();
    TestBed.flushEffects();

    // 접힌 상태에서 카드가 안보임
    expect(fixture.nativeElement.querySelector("sd-kanban")).toBeNull();

    // 펼치기 버튼 클릭
    const anchor = fixture.nativeElement.querySelector("sd-anchor") as HTMLElement;
    anchor.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.collapsed).toBe(false);
    expect(fixture.nativeElement.querySelector("sd-kanban")).not.toBeNull();
  });

  it("useCollapse=false이면 접기 버튼이 표시되지 않는다", () => {
    setupTestBed(SdKanbanLaneNoCollapseTest);
    const fixture = TestBed.createComponent(SdKanbanLaneNoCollapseTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const anchor = fixture.nativeElement.querySelector("sd-anchor");
    expect(anchor).toBeNull();
  });
});
