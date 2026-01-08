import { describe, expect, it } from "vitest";
import type { ISdWorkerType, ISdWorkerRequest, TSdWorkerResponse } from "../../src/worker/types";

// 타입 정의 테스트용 인터페이스
interface ITestWorkerType extends ISdWorkerType {
  methods: {
    add: { params: [number, number]; returnType: number };
    greet: { params: [string]; returnType: string };
    noReturn: { params: []; returnType: void };
  };
  events: {
    progress: number;
    status: string;
  };
}

describe("Worker Types", () => {
  //#region ISdWorkerType

  describe("ISdWorkerType", () => {
    it("메서드와 이벤트 타입 정의", () => {
      // 타입 검증 - 컴파일 타임에 체크됨
      const _workerType: ITestWorkerType = {
        methods: {
          add: { params: [1, 2], returnType: 3 },
          greet: { params: ["hello"], returnType: "greeting" },
          noReturn: { params: [], returnType: undefined },
        },
        events: {
          progress: 50,
          status: "running",
        },
      };

      expect(_workerType.methods.add.params).toEqual([1, 2]);
      expect(_workerType.events.progress).toBe(50);
    });
  });

  //#endregion

  //#region ISdWorkerRequest

  describe("ISdWorkerRequest", () => {
    it("요청 메시지 구조 검증", () => {
      const request: ISdWorkerRequest<ITestWorkerType, "add"> = {
        id: "test-uuid-123",
        method: "add",
        params: [10, 20],
      };

      expect(request.id).toBe("test-uuid-123");
      expect(request.method).toBe("add");
      expect(request.params).toEqual([10, 20]);
    });

    it("다른 메서드의 요청", () => {
      const request: ISdWorkerRequest<ITestWorkerType, "greet"> = {
        id: "test-uuid-456",
        method: "greet",
        params: ["World"],
      };

      expect(request.method).toBe("greet");
      expect(request.params).toEqual(["World"]);
    });
  });

  //#endregion

  //#region TSdWorkerResponse

  describe("TSdWorkerResponse", () => {
    it("return 타입 응답", () => {
      const response: TSdWorkerResponse<ITestWorkerType, "add"> = {
        request: { id: "1", method: "add", params: [1, 2] },
        type: "return",
        body: 3,
      };

      expect(response.type).toBe("return");
      if (response.type === "return") {
        expect(response.body).toBe(3);
        expect(response.request.method).toBe("add");
      }
    });

    it("error 타입 응답", () => {
      const error = new Error("Test error");
      const response: TSdWorkerResponse<ITestWorkerType, "add"> = {
        request: { id: "1", method: "add", params: [1, 2] },
        type: "error",
        body: error,
      };

      expect(response.type).toBe("error");
      if (response.type === "error") {
        expect(response.body).toBeInstanceOf(Error);
        expect(response.body.message).toBe("Test error");
      }
    });

    it("event 타입 응답", () => {
      const response: TSdWorkerResponse<ITestWorkerType, "add"> = {
        type: "event",
        event: "progress",
        body: 75,
      };

      expect(response.type).toBe("event");
      if (response.type === "event") {
        expect(response.event).toBe("progress");
        expect(response.body).toBe(75);
      }
    });

    it("log 타입 응답", () => {
      const response: TSdWorkerResponse<ITestWorkerType, "add"> = {
        type: "log",
        body: "Log message from worker",
      };

      expect(response.type).toBe("log");
      if (response.type === "log") {
        expect(response.body).toBe("Log message from worker");
      }
    });
  });

  //#endregion

  //#region Type Safety

  describe("Type Safety", () => {
    it("제네릭 타입 파라미터로 타입 안전성 보장", () => {
      // 이 테스트는 컴파일 타임에 타입 체크됨
      // 잘못된 타입은 컴파일 에러 발생

      // 올바른 타입
      const _validRequest: ISdWorkerRequest<ITestWorkerType, "add"> = {
        id: "1",
        method: "add",
        params: [1, 2],
      };

      // 아래 코드는 컴파일 에러가 발생해야 함 (테스트에서는 주석 처리)
      // const invalidRequest: ISdWorkerRequest<ITestWorkerType, "add"> = {
      //   id: "1",
      //   method: "add",
      //   params: ["string", "invalid"], // Error: string is not number
      // };

      expect(_validRequest.params).toEqual([1, 2]);
    });
  });

  //#endregion
});
