import * as assert from "assert";
import {describe, it} from "mocha";
import {optional} from "@simplism/core";

describe("Optional", () => {
  it("체인 중간에 'undefined'가 있어도 오류가 발생하지 않고, 결과값으로 'undefined'를 내보냄", () => {
    const obj: {
      a?: {
        b: number;
        c: number;
        d?: {
          e: number;
          f: number;
        };
      };
    } = {
      a: {
        b: 1,
        c: 2
      }
    };

    assert.strictEqual(optional(obj, o => o.a.b), 1);
    assert.strictEqual(optional(obj, o => o.a.d.e), undefined);
  });
});