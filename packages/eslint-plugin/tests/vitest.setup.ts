import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
