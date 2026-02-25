import { describe, it, expect } from "vitest";
import { SdError, ArgumentError } from "@simplysm/core-common";

describe("Errors", () => {
  //#region SdError

  describe("SdError", () => {
    it("Creates with cause", () => {
      const cause = new Error("original error");
      const error = new SdError(cause, "wrapped message");

      // Message combined as "wrapped message => original error" format
      expect(error.message).toContain("wrapped message");
      expect(error.message).toContain("original error");
    });

    it("Integrates cause message", () => {
      const cause = new Error("cause message");
      const error = new SdError(cause, "main message");

      expect(error.message).toContain("main message");
    });

    it("Handles multi-level cause chain", () => {
      const root = new Error("root error");
      const middle = new SdError(root, "middle error");
      const top = new SdError(middle, "top error");

      expect(top.message).toContain("top error");
      expect(top.message).toContain("middle error");
      expect(top.message).toContain("root error");
    });

    it("Integrates cause stack to current stack", () => {
      const cause = new Error("cause error");
      const error = new SdError(cause, "main error");

      expect(error.stack).toContain("---- cause stack ----");
      expect(error.stack).toContain(cause.stack);
    });

    it("Converts non-Error object passed as cause using String()", () => {
      // number
      const errorFromNumber = new SdError(42, "number cause");
      expect(errorFromNumber.message).toContain("42");

      // object
      const errorFromObject = new SdError({ code: 500, reason: "server error" }, "object cause");
      expect(errorFromObject.message).toContain("object cause");

      // null/undefined
      const errorFromNull = new SdError(null, "null cause");
      expect(errorFromNull.message).toContain("null cause");
    });
  });

  //#endregion

  //#region ArgumentError

  describe("ArgumentError", () => {
    it("Creates with argObj", () => {
      const error = new ArgumentError("invalid argument", { param: "value", expected: "string" });

      // argObj included in message as YAML format
      expect(error.message).toContain("invalid argument");
      expect(error.message).toContain("param");
      expect(error.message).toContain("value");
    });

    it("Creates with only argObj without message", () => {
      const error = new ArgumentError({ key: "value" });

      expect(error.message).toContain("Invalid arguments");
      expect(error.message).toContain("key");
    });
  });

  //#endregion
});
