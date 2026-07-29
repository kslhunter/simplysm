import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TestDragResizeHost } from "./inject-drag-resize-test.fixture";

function setup() {
  TestBed.configureTestingModule({ imports: [TestDragResizeHost] });
  const fixture = TestBed.createComponent(TestDragResizeHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function drag(
  comp: TestDragResizeHost,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  comp.dragResize.startDrag(new MouseEvent("mousedown", { clientX: fromX, clientY: fromY }));
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: toX, clientY: toY }));
  document.dispatchEvent(new MouseEvent("mouseup"));
}

function resize(
  comp: TestDragResizeHost,
  dir: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  comp.dragResize.startResize(new MouseEvent("mousedown", { clientX: fromX, clientY: fromY }), dir);
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: toX, clientY: toY }));
  document.dispatchEvent(new MouseEvent("mouseup"));
}

describe("injectDragResize 드래그", () => {
  it("드래그를 시작해도 다이얼로그가 제자리에 있다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    const before = dialogEl.getBoundingClientRect();
    drag(comp, 500, 100, 500, 100);
    const after = dialogEl.getBoundingClientRect();

    expect(after.left).toBe(before.left);
    expect(after.top).toBe(before.top);
  });

  it("드래그하면 커서 이동량만큼 이동한다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    const before = dialogEl.getBoundingClientRect();
    drag(comp, 500, 100, 620, 160);
    const after = dialogEl.getBoundingClientRect();

    expect(after.left - before.left).toBe(120);
    expect(after.top - before.top).toBe(60);
  });

  it("드래그를 반복해도 이동량이 누적되지 않는다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    const before = dialogEl.getBoundingClientRect();
    drag(comp, 500, 100, 550, 130);
    drag(comp, 550, 130, 610, 150);
    const after = dialogEl.getBoundingClientRect();

    expect(after.left - before.left).toBe(110);
    expect(after.top - before.top).toBe(50);
  });

  it("mouseup 시 onEnd 가 호출된다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;

    drag(comp, 100, 50, 150, 50);

    expect(comp.endCalled).toBe(true);
  });
});

describe("injectDragResize 리사이즈", () => {
  it("오른쪽 핸들을 끌면 좌변은 그대로 두고 폭만 커진다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    const before = dialogEl.getBoundingClientRect();
    resize(comp, "right", before.right, 200, before.right + 100, 200);
    const after = dialogEl.getBoundingClientRect();

    expect(after.left).toBe(before.left);
    expect(after.width).toBe(before.width + 100);
  });

  it("왼쪽 핸들을 끌면 우변은 그대로 두고 좌변이 커서를 따라온다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    const before = dialogEl.getBoundingClientRect();
    resize(comp, "left", before.left, 200, before.left + 50, 200);
    const after = dialogEl.getBoundingClientRect();

    expect(after.left).toBe(before.left + 50);
    expect(after.right).toBe(before.right);
  });

  it("minWidthPx 미만으로 줄면 폭도 좌변도 변하지 않는다", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    comp.minWidthPx.set(300);

    const before = dialogEl.getBoundingClientRect();
    resize(comp, "left", before.left, 200, before.left + 150, 200);
    const after = dialogEl.getBoundingClientRect();

    expect(after.width).toBe(before.width);
    expect(after.left).toBe(before.left);
  });
});
