import * as assert from "assert";
import {JsonConvert} from "@simplism/core";

export class Assert {
  public static equal(actual: any, expected: any): void {
    if (!Object.equal(actual, expected)) {
      throw new assert.AssertionError({
        message: `not equal`,
        actual: JsonConvert.parse(JsonConvert.stringify(actual)),
        expected: JsonConvert.parse(JsonConvert.stringify(expected)),
        stackStartFunction: Assert.equal
      });
    }
  }

  public static notEqual(actual: any, expected: any): void {
    if (Object.equal(actual, expected)) {
      throw new assert.AssertionError({
        message: `equal`,
        actual: JsonConvert.stringify(actual),
        expected: JsonConvert.stringify(expected),
        stackStartFunction: Assert.notEqual
      });
    }
  }

  public static fail(message?: string): void {
    throw new assert.AssertionError({
      message: message || `failed`,
      stackStartFunction: Assert.fail
    });
  }
}