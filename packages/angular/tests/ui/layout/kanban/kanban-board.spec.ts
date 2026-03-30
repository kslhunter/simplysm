import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdKanbanBoardTestHorizontal } from "./sd-kanban-test.fixture";
import {
  SdKanbanBoardControl,
  type ISdKanbanDragRef,
  type ISdKanbanDropTarget,
} from "../../../../src/ui/layout/kanban/sd-kanban-board.control";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
  });
}

describe("Feature 6.3 Slice 1: SdKanbanBoardControl 기본 구조", () => {
  it("Board에 여러 lane을 수평 나열한다 — inline-flex row 레이아웃으로 lane들을 좌→우 수평 배치하고 높이 100%를 채운다", () => {
    setupTestBed(SdKanbanBoardTestHorizontal);
    const fixture = TestBed.createComponent(SdKanbanBoardTestHorizontal);
    fixture.detectChanges();

    const board = fixture.nativeElement.querySelector("sd-kanban-board") as HTMLElement;
    const style = getComputedStyle(board);

    expect(style.display).toBe("inline-flex");
    expect(style.flexDirection).toBe("row");
    expect(style.flexWrap).toBe("nowrap");
    // height: 100%는 부모가 없으면 computed style에서 0px로 계산되므로
    // 스타일 규칙이 적용되었는지 확인
    const rules = Array.from(document.styleSheets)
      .flatMap((s) => {
        try {
          return Array.from(s.cssRules);
        } catch {
          return [];
        }
      })
      .filter((r): r is CSSStyleRule => r instanceof CSSStyleRule);
    const boardRule = rules.find(
      (r) => r.selectorText === "sd-kanban-board" && r.style.height === "100%",
    );
    expect(boardRule).toBeDefined();
  });

  // --- Unit Tests ---

  it("dragKanban 초기값은 undefined이다", () => {
    setupTestBed(SdKanbanBoardTestHorizontal);
    const fixture = TestBed.createComponent(SdKanbanBoardTestHorizontal);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as SdKanbanBoardControl<
      string,
      number
    >;
    expect(board.dragKanban()).toBeUndefined();
  });

  it("onDocumentDragEnd 호출 시 dragKanban이 undefined로 초기화된다", () => {
    setupTestBed(SdKanbanBoardTestHorizontal);
    const fixture = TestBed.createComponent(SdKanbanBoardTestHorizontal);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as SdKanbanBoardControl<
      string,
      number
    >;
    const fakeDragRef: ISdKanbanDragRef<string, number> = {
      value: () => 1,
      heightOnDrag: () => 100,
    };
    board.dragKanban.set(fakeDragRef);
    expect(board.dragKanban()).toBe(fakeDragRef);

    board.onDocumentDragEnd();
    expect(board.dragKanban()).toBeUndefined();
  });

  it("onDropTo 호출 시 drop 이벤트가 발생하고 dragKanban이 초기화된다", () => {
    setupTestBed(SdKanbanBoardTestHorizontal);
    const fixture = TestBed.createComponent(SdKanbanBoardTestHorizontal);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as SdKanbanBoardControl<
      string,
      number
    >;
    const fakeDragRef: ISdKanbanDragRef<string, number> = {
      value: () => 42,
      heightOnDrag: () => 100,
    };
    board.dragKanban.set(fakeDragRef);

    let emitted: any;
    board.drop.subscribe((v: any) => {
      emitted = v;
    });

    const fakeTarget: ISdKanbanDropTarget<string, number> = {
      targetLaneValue: () => "lane2",
      targetKanbanValue: () => 99,
    };
    board.onDropTo(fakeTarget);

    expect(emitted).toEqual({
      sourceKanbanValue: 42,
      targetLaneValue: "lane2",
      targetKanbanValue: 99,
    });
    expect(board.dragKanban()).toBeUndefined();
  });

  it("dragKanban이 undefined일 때 onDropTo 호출하면 drop 이벤트가 발생하지 않는다", () => {
    setupTestBed(SdKanbanBoardTestHorizontal);
    const fixture = TestBed.createComponent(SdKanbanBoardTestHorizontal);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as SdKanbanBoardControl<
      string,
      number
    >;
    let emitted = false;
    board.drop.subscribe(() => {
      emitted = true;
    });

    const fakeTarget: ISdKanbanDropTarget<string, number> = {
      targetLaneValue: () => "lane1",
    };
    board.onDropTo(fakeTarget);

    expect(emitted).toBe(false);
  });
});
