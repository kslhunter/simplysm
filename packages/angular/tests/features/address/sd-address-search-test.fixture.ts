import { vi } from "vitest";

export interface MockDaumPostcodeOptions {
  oncomplete: (data: any) => void;
  onresize: (size: { height: number }) => void;
  width: string;
  height: string;
}

export function setupMockDaum() {
  const embedFn = vi.fn();
  let capturedOptions: MockDaumPostcodeOptions | undefined;

  class MockPostcode {
    constructor(options: MockDaumPostcodeOptions) {
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
