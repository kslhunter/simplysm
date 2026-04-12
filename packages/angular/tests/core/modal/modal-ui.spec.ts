import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import {
  SdModalTestFocusable,
  SdModalProviderTestHost,
} from "./sd-modal-test.fixture";
import "@simplysm/core-browser";

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdModalProviderTestHost] });
  const fixture = TestBed.createComponent(SdModalProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 100));
  fixture.detectChanges();
  TestBed.flushEffects();
}

function getModalInBody(): HTMLElement | null {
  return document.body.querySelector("sd-modal");
}

async function openModal(
  fixture: any,
  options?: Record<string, any>,
): Promise<{ modal: HTMLElement; promise: Promise<any> }> {
  const provider = TestBed.inject(SdModalProvider);
  const promise = provider.showAsync(
    { title: "UI Test", type: SdModalTestFocusable, inputs: { title: "test" } },
    options,
  );
  await tick(fixture);
  const modal = getModalInBody()!;
  return { modal, promise };
}

async function closeModal(fixture: any, modal: HTMLElement, promise: Promise<any>) {
  const closeBtn = modal.querySelector<HTMLElement>("._close-btn");
  if (closeBtn != null) closeBtn.click();
  await tick(fixture);
  await promise;
}

describe("Feature 3.2 Slice 5: UI 커스터마이즈", () => {
  // Acceptance: 크기 조절 - mousedown/mousemove로 크기 변경
  it("리사이즈 핸들 드래그로 모달 크기가 변경된다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, {
      resizable: true,
      widthPx: 400,
      heightPx: 300,
    });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const rightHandle = modal.querySelector('[data-resize-dir="right"]') as HTMLElement;
    expect(rightHandle).not.toBeNull();

    // mousedown on handle
    rightHandle.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 400, clientY: 200, bubbles: true }),
    );
    // mousemove
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 500, clientY: 200, bubbles: true }),
    );
    // mouseup
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // 너비가 100px 증가해야 함
    const width = parseInt(dialog.style.width || "0", 10);
    expect(width).toBeGreaterThanOrEqual(500);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 드래그 이동
  it("movable=true이면 헤더 드래그로 모달이 이동한다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, { movable: true });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const header = modal.querySelector("._header") as HTMLElement;
    expect(header).not.toBeNull();

    const initialLeft = dialog.style.left;

    // 헤더 드래그
    header.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 200, clientY: 50, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 350, clientY: 50, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // left 값이 변경되어야 함
    expect(dialog.style.left).not.toBe(initialLeft);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 최소 크기 제한
  it("minWidthPx/minHeightPx 미만으로 리사이즈되지 않는다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, {
      resizable: true,
      widthPx: 400,
      heightPx: 300,
      minWidthPx: 300,
      minHeightPx: 200,
    });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const leftHandle = modal.querySelector('[data-resize-dir="left"]') as HTMLElement;

    // 왼쪽 핸들을 오른쪽으로 200px 드래그 (너비 200px 감소 시도)
    leftHandle.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 100, clientY: 200, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 300, clientY: 200, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // minWidthPx(300) 이하로 줄지 않아야 함
    const width = parseInt(dialog.style.width || "0", 10);
    expect(width).toBeGreaterThanOrEqual(300);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 초기 크기 지정
  it("widthPx/heightPx로 초기 크기가 지정된다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, { widthPx: 500, heightPx: 400 });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    expect(dialog.style.width).toBe("500px");
    expect(dialog.style.height).toBe("400px");

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 설정 저장 및 복원
  it("key가 지정되면 크기를 저장하고 다시 열 때 복원한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    // 첫 번째 모달: key 지정 + 크기 지정
    const promise1 = provider.showAsync(
      { title: "Persist", type: SdModalTestFocusable, inputs: { title: "test" } },
      { key: "test-modal", widthPx: 600, heightPx: 500 },
    );
    await tick(fixture);

    const modal1 = getModalInBody()!;
    await closeModal(fixture, modal1, promise1);

    // 두 번째 모달: 같은 key로 다시 열기
    const promise2 = provider.showAsync(
      { title: "Persist", type: SdModalTestFocusable, inputs: { title: "test" } },
      { key: "test-modal" },
    );
    await tick(fixture);

    const modal2 = getModalInBody()!;
    const dialog2 = modal2.querySelector("._dialog") as HTMLElement;

    // 이전 크기가 복원되어야 함
    expect(dialog2.style.width).toBe("600px");
    expect(dialog2.style.height).toBe("500px");

    await closeModal(fixture, modal2, promise2);
  });
});
