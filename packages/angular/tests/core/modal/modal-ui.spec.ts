import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import { SdSystemConfigProvider } from "../../../src/core/config/sd-system-config.provider";
import { SdModalTestTabbable, SdModalProviderTestHost } from "./sd-modal-test.fixture";
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
    { title: "UI Test", type: SdModalTestTabbable, inputs: { title: "test" } },
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

    const before = dialog.getBoundingClientRect();

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

    // 오른쪽 핸들이므로 좌변은 고정된 채 너비만 100px 증가해야 함
    const after = dialog.getBoundingClientRect();
    expect(after.width).toBe(before.width + 100);
    expect(after.left).toBe(before.left);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 드래그 이동
  it("movable=true이면 헤더 드래그로 모달이 이동한다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, { movable: true });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const header = modal.querySelector("._header") as HTMLElement;
    expect(header).not.toBeNull();

    const before = dialog.getBoundingClientRect();

    // 헤더 드래그
    header.dispatchEvent(new MouseEvent("mousedown", { clientX: 200, clientY: 50, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 350, clientY: 50, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // 커서 이동량만큼만 이동해야 함
    const after = dialog.getBoundingClientRect();
    expect(after.left - before.left).toBe(150);
    expect(after.top - before.top).toBe(0);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: 우하단 고정 모달도 드래그로 찌그러지지 않는다
  it("position='bottom-right' 모달을 아래로 드래그해도 높이가 유지된다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, {
      movable: true,
      position: "bottom-right",
    });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const header = modal.querySelector("._header") as HTMLElement;

    const before = dialog.getBoundingClientRect();

    header.dispatchEvent(new MouseEvent("mousedown", { clientX: 200, clientY: 50, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 200, clientY: 150, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    const after = dialog.getBoundingClientRect();
    expect(after.height).toBe(before.height);
    expect(after.top - before.top).toBe(100);

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

    const before = dialog.getBoundingClientRect();

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

    // minWidthPx(300) 미만이 되므로 너비도 좌변도 그대로여야 함
    const after = dialog.getBoundingClientRect();
    expect(after.width).toBe(before.width);
    expect(after.left).toBe(before.left);

    await closeModal(fixture, modal, promise);
  });

  // Acceptance: minWidthPx 미지정 모달도 CSS 최소 너비를 하한으로 지킨다
  it("minWidthPx를 주지 않아도 CSS 최소 너비 아래로 끌 때 모달이 밀려나지 않는다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, { resizable: true, widthPx: 400 });

    const dialog = modal.querySelector("._dialog") as HTMLElement;
    const leftHandle = modal.querySelector('[data-resize-dir="left"]') as HTMLElement;

    const before = dialog.getBoundingClientRect();

    // CSS min-width(200px)를 넘겨 줄이려 시도
    leftHandle.dispatchEvent(
      new MouseEvent("mousedown", { clientX: before.left, clientY: 200, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: before.left + 350, clientY: 200, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // 하한을 넘기면 폭이 안 줄어드는데, 좌변만 이동하면 우변이 오른쪽으로 밀려난다
    const after = dialog.getBoundingClientRect();
    expect(after.width).toBe(before.width);
    expect(after.right).toBe(before.right);

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
      { title: "Persist", type: SdModalTestTabbable, inputs: { title: "test" } },
      { key: "test-modal", widthPx: 600, heightPx: 500 },
    );
    await tick(fixture);

    const modal1 = getModalInBody()!;
    await closeModal(fixture, modal1, promise1);

    // 두 번째 모달: 같은 key로 다시 열기
    const promise2 = provider.showAsync(
      { title: "Persist", type: SdModalTestTabbable, inputs: { title: "test" } },
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

  // Acceptance: 화면 넘침 클램프 값이 아니라 원래 크기가 저장된다
  it("화면보다 큰 모달을 닫으면 화면에 맞춘 크기가 아니라 지정한 크기가 저장된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Clamp", type: SdModalTestTabbable, inputs: { title: "test" } },
      { key: "test-modal-clamp", heightPx: 5000 },
    );
    await tick(fixture);

    const modal = getModalInBody()!;
    const dialog = modal.querySelector("._dialog") as HTMLElement;

    // 화면을 넘치므로 100%로 클램프된 상태
    expect(dialog.style.height).toBe("100%");

    await closeModal(fixture, modal, promise);

    const config = await TestBed.inject(SdSystemConfigProvider).getAsync(
      "sd-modal.test-modal-clamp",
    );
    expect((config as Record<string, string>)["height"]).toBe("5000px");
  });

  // Acceptance: 위치 저장 및 복원
  it("key가 지정되면 드래그한 위치를 저장하고 다시 열 때 같은 자리에 뜬다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise1 = provider.showAsync(
      { title: "Persist", type: SdModalTestTabbable, inputs: { title: "test" } },
      { key: "test-modal-position", movable: true },
    );
    await tick(fixture);

    const modal1 = getModalInBody()!;
    const dialog1 = modal1.querySelector("._dialog") as HTMLElement;
    const header1 = modal1.querySelector("._header") as HTMLElement;

    header1.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 200, clientY: 50, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 260, clientY: 90, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await tick(fixture);

    const draggedLeft = dialog1.offsetLeft;
    const draggedTop = dialog1.offsetTop;
    await closeModal(fixture, modal1, promise1);

    // 같은 key로 다시 열기
    const promise2 = provider.showAsync(
      { title: "Persist", type: SdModalTestTabbable, inputs: { title: "test" } },
      { key: "test-modal-position", movable: true },
    );
    await tick(fixture);

    const modal2 = getModalInBody()!;
    const dialog2 = modal2.querySelector("._dialog") as HTMLElement;

    expect(dialog2.offsetLeft).toBe(draggedLeft);
    expect(dialog2.offsetTop).toBe(draggedTop);

    await closeModal(fixture, modal2, promise2);
  });
});

describe("Feature 2.1 Slice 1: SdModalProvider headerStyle 전달", () => {
  // Acceptance: SdModalProvider.showAsync에서 headerStyle 옵션을 전달할 수 있다
  it("options.headerStyle이 전달되면 모달의 ._header div에 스타일이 적용된다", async () => {
    const fixture = setupHost();
    const { modal, promise } = await openModal(fixture, { headerStyle: "color: blue" });

    const header = modal.querySelector("._header") as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.style.color).toBe("blue");

    await closeModal(fixture, modal, promise);
  });
});
