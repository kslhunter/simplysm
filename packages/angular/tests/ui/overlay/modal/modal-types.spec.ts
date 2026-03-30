import { describe, it, expect } from "vitest";
import type { TDirectiveInputSignals } from "../../../../src/core/utils/TDirectiveInputSignals";
import {
  SdActivatedModalProvider,
  type ISdModalInfo,
} from "../../../../src/ui/overlay/modal/sd-modal.provider";
import { SdModalTestBasic } from "./sd-modal-test.fixture";

describe("Feature 3.2 Slice 1: 타입 기반 + 인터페이스", () => {
  // Acceptance: InputSignal 타입 추출
  it("TDirectiveInputSignals는 InputSignal에서 원시 타입을 추출한다", () => {
    // TDirectiveInputSignals<SdModalTestBasic>는
    // { title: string; age: number; initialized: boolean; close: ... }가 아니라
    // InputSignal인 필드만 추출해야 한다
    // close는 OutputEmitterRef이므로 제외되어야 한다
    // initialized는 Signal이지 InputSignal이 아니므로 제외되어야 한다

    // 타입 레벨 테스트: 올바른 할당이 컴파일되면 통과
    const inputs: TDirectiveInputSignals<SdModalTestBasic> = {
      title: "hello",
      age: 42,
    };
    expect(inputs.title).toBe("hello");
    expect(inputs.age).toBe(42);
  });

  // Acceptance: ISdModalInfo inputs 타입 안전성
  it("ISdModalInfo의 inputs가 타입 안전하게 동작한다", () => {
    const info: ISdModalInfo<SdModalTestBasic> = {
      title: "Test Modal",
      type: SdModalTestBasic,
      inputs: { title: "hello" },
    };
    expect(info.inputs.title).toBe("hello");
    expect(info.type).toBe(SdModalTestBasic);
  });

  // Acceptance: ISdModal 내부 속성(initialized, close, actionTplRef) 제외
  it("ISdModalInfo inputs에서 initialized, close, actionTplRef가 제외된다", () => {
    // ISdModalInfo의 inputs 타입에서 initialized, close, actionTplRef 키가 없어야 함
    const info: ISdModalInfo<SdModalTestBasic> = {
      title: "Test",
      type: SdModalTestBasic,
      inputs: { title: "test" },
    };

    // inputs ���체에 initialized, close ��가 존재하지 않음을 런타임에서 확인
    const inputKeys = Object.keys(info.inputs);
    expect(inputKeys).not.toContain("initialized");
    expect(inputKeys).not.toContain("close");
    expect(inputKeys).not.toContain("actionTplRef");
  });

  // Unit: optional input(기본값이 있는 input)은 inputs에서 생략 가능
  it("기본값이 있는 input은 inputs에서 생략 가능하다", () => {
    // age는 input(0)이므로 기본값이 있다 — 생략 가능해야 한다
    const info: ISdModalInfo<SdModalTestBasic> = {
      title: "Test",
      type: SdModalTestBasic,
      inputs: { title: "required-only" },
    };
    expect(info.inputs.title).toBe("required-only");
    expect((info.inputs as Record<string, unknown>)["age"]).toBeUndefined();
  });

  // Unit: SdActivatedModalProvider의 canDeactivefn 기본값은 true를 반환
  it("SdActivatedModalProvider.canDeactivefn 기본값은 true를 반환한다", () => {
    const provider = new SdActivatedModalProvider();
    expect(provider.canDeactivefn()).toBe(true);
    expect(provider.modalComponent()).toBeUndefined();
    expect(provider.contentComponent()).toBeUndefined();
  });
});
