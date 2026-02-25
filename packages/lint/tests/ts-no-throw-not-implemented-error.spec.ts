import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-throw-not-implemented-error";

const ruleTester = new RuleTester();

describe("ts-no-throw-not-implemented-error rule", () => {
  describe("allowed code (valid)", () => {
    describe("NotImplementedError from other modules is allowed", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              class NotImplementedError extends Error {}
              throw new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("NotImplementedError from packages other than @simplysm/core-common is allowed", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              import { NotImplementedError } from "other-package";
              throw new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("usage without import is allowed", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              declare const NotImplementedError: new (msg?: string) => Error;
              new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("code that should cause errors (invalid)", () => {
    describe("creating NotImplementedError imported from @simplysm/core-common with new", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("usage with throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("usage with message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError("This feature is not yet implemented");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "This feature is not yet implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("also detects when imported as alias", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError as NIE } from "@simplysm/core-common";
              new NIE();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("also detects when assigned to variable", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              const err = new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("also detects when passed as function argument", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              function handleError(err: Error) {}
              handleError(new NotImplementedError());
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("usage with other imports", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { SdError, NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("multiple usages produce errors for each", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              new NotImplementedError("first");
              new NotImplementedError("second");
            `,
            errors: [
              { messageId: "noThrowNotImplementedError", data: { text: "first" } },
              { messageId: "noThrowNotImplementedError", data: { text: "second" } },
            ],
          },
        ],
      });
    });

    describe("usage with namespace import", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import * as CoreCommon from "@simplysm/core-common";
              throw new CoreCommon.NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("namespace import with message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import * as CC from "@simplysm/core-common";
              new CC.NotImplementedError("not yet implemented");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "not yet implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("template literal argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError(\`dynamic message\`);
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("variable argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              const msg = "dynamic message";
              throw new NotImplementedError(msg);
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("numeric argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError(123);
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("empty string argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError("");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("null argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError(null);
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });

    describe("undefined argument falls back to default message", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError(undefined);
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "Not implemented" },
              },
            ],
          },
        ],
      });
    });
  });

  describe("namespace import from other packages is allowed", () => {
    ruleTester.run("ts-no-throw-not-implemented-error", rule, {
      valid: [
        {
          code: `
            import * as OtherPkg from "other-package";
            new OtherPkg.NotImplementedError();
          `,
        },
      ],
      invalid: [],
    });
  });

  describe("limitation: re-exported NotImplementedError is not detected", () => {
    ruleTester.run("ts-no-throw-not-implemented-error", rule, {
      valid: [
        {
          // re-exported from another module is not detected
          code: `
            import { NotImplementedError } from "./my-errors";
            throw new NotImplementedError();
          `,
        },
      ],
      invalid: [],
    });
  });

  describe("limitation: dynamic import is not detected", () => {
    ruleTester.run("ts-no-throw-not-implemented-error", rule, {
      valid: [
        {
          // dynamic import usage is not detected
          code: `
            async function test() {
              const { NotImplementedError } = await import("@simplysm/core-common");
              throw new NotImplementedError();
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});
