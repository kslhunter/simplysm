import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";

// @typescript-eslint/rule-tester는 Vitest를 직접 지원하지 않으므로,
// Vitest의 테스트 함수들을 수동으로 바인딩해야 한다.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.itSkip = it.skip;
