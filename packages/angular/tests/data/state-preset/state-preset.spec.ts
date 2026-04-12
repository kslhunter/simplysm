import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdLocalStorageProvider } from "../../../src/core/config/sd-local-storage.provider";
import { SdStatePresetTestHost } from "./sd-state-preset-test.fixture";
import { SdStatePreset } from "../../../src/data/state-preset/sd-state-preset";

function createMockModalProvider() {
  return {
    showAsync: vi.fn().mockResolvedValue(undefined),
    modalCount: signal(0),
  };
}

function createMockToastProvider() {
  return {
    info: vi.fn(),
    warning: vi.fn(),
  };
}

function createMockLocalStorage() {
  const store = new Map<string, any>();
  return {
    set: vi.fn((key: string, value: any) => store.set(key, value)),
    get: vi.fn((key: string) => store.get(key)),
  };
}

let mockModal: ReturnType<typeof createMockModalProvider>;
let mockToast: ReturnType<typeof createMockToastProvider>;
let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

function setupTestBed() {
  mockModal = createMockModalProvider();
  mockToast = createMockToastProvider();
  mockLocalStorage = createMockLocalStorage();
  TestBed.configureTestingModule({
    imports: [SdStatePresetTestHost],
    providers: [
      { provide: SdModalProvider, useValue: mockModal },
      { provide: SdToastProvider, useValue: mockToast },
      { provide: SdLocalStorageProvider, useValue: mockLocalStorage },
    ],
  });
}

describe("SdStatePreset 프리셋 이름 중복 검사", () => {
  beforeEach(() => {
    setupTestBed();
  });

  it("중복되는 이름으로 추가 시 경고 토스트를 표시하고 프리셋 목록을 변경하지 않는다", async () => {
    const fixture = TestBed.createComponent(SdStatePresetTestHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const presetComp = fixture.debugElement.children[0].componentInstance as SdStatePreset;

    // 첫 번째 프리셋 추가: "필터A"
    mockModal.showAsync.mockResolvedValueOnce("필터A");
    await presetComp.onAddClick();
    fixture.detectChanges();

    expect(presetComp._presets().length).toBe(1);
    expect(presetComp._presets()[0].name).toBe("필터A");

    // 중복 이름 "필터A"로 추가 시도
    mockModal.showAsync.mockResolvedValueOnce("필터A");
    await presetComp.onAddClick();
    fixture.detectChanges();

    // 프리셋 목록이 변경되지 않았는지 확인
    expect(presetComp._presets().length).toBe(1);
    // 경고 토스트가 호출되었는지 확인
    expect(mockToast.warning).toHaveBeenCalled();
  });

  it("중복되지 않는 이름으로 추가 시 프리셋 목록에 추가된다", async () => {
    const fixture = TestBed.createComponent(SdStatePresetTestHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const presetComp = fixture.debugElement.children[0].componentInstance as SdStatePreset;

    // "필터A" 추가
    mockModal.showAsync.mockResolvedValueOnce("필터A");
    await presetComp.onAddClick();
    fixture.detectChanges();

    // "필터B" 추가
    mockModal.showAsync.mockResolvedValueOnce("필터B");
    await presetComp.onAddClick();
    fixture.detectChanges();

    expect(presetComp._presets().length).toBe(2);
    expect(presetComp._presets().map((p) => p.name)).toEqual(["필터A", "필터B"]);
  });
});
