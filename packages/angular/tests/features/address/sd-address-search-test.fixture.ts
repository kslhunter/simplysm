import { vi } from "vitest";

export interface IMockDaumPostcodeOptions {
  oncomplete: (data: any) => void;
  onresize: (size: { height: number }) => void;
  width: string;
  height: string;
}

export function setupMockDaum() {
  const embedFn = vi.fn();
  let capturedOptions: IMockDaumPostcodeOptions | undefined;

  class MockPostcode {
    constructor(options: IMockDaumPostcodeOptions) {
      capturedOptions = options;
    }

    embed = embedFn;
  }

  const mockDaum = {
    postcode: {
      load: vi.fn((cb: () => void) => cb()),
    },
    Postcode: MockPostcode,
  };

  Object.defineProperty(globalThis, "daum", {
    value: mockDaum,
    writable: true,
    configurable: true,
  });

  return {
    mockDaum,
    embedFn,
    getCapturedOptions: () => capturedOptions,
    cleanup: () => {
      delete (globalThis as any).daum;
    },
  };
}
