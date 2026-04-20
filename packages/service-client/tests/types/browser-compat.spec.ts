import { describe, it, expect } from "vitest";
import {
  isBrowserWorkerSupported,
  isNodeWorkerSupported,
  isWorkerSupported,
} from "../../src/types/browser-compat";

const proc = (globalThis as Record<string, unknown>)["process"] as
  | { versions?: { node?: string } }
  | undefined;
const isNode = proc?.versions?.node != null;

describe("isBrowserWorkerSupported", () => {
  it("환경에 따라 DOM Worker 지원 여부를 반환한다", () => {
    if (isNode) {
      expect(isBrowserWorkerSupported()).toBe(false);
    } else {
      expect(isBrowserWorkerSupported()).toBe(true);
    }
  });
});

describe("isNodeWorkerSupported", () => {
  it("환경에 따라 worker_threads 지원 여부를 반환한다", () => {
    if (isNode) {
      expect(isNodeWorkerSupported()).toBe(true);
    } else {
      expect(isNodeWorkerSupported()).toBe(false);
    }
  });
});

describe("isWorkerSupported", () => {
  it("어느 환경에서든 Worker 오프로딩이 가능하다", () => {
    expect(isWorkerSupported()).toBe(true);
  });
});
