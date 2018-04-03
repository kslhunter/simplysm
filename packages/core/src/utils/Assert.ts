import * as assert from "assert";
import {JsonConvert} from "./JsonConvert";

export class Assert {
    static equal(actual: any, expected: any): void {
        if (!Assert._compare(actual, expected)) {
            throw new assert.AssertionError({
                message: `not equal`,
                actual: JsonConvert.parse(JsonConvert.stringify(actual)),
                expected: JsonConvert.parse(JsonConvert.stringify(expected)),
                stackStartFunction: Assert.equal
            });
        }
    }

    static notEqual(actual: any, expected: any): void {
        if (Assert._compare(actual, expected)) {
            throw new assert.AssertionError({
                message: `equal`,
                actual: JsonConvert.stringify(actual),
                expected: JsonConvert.stringify(expected),
                stackStartFunction: Assert.notEqual
            });
        }
    }

    static fail(message?: string): void {
        throw new assert.AssertionError({
            message: message || `failed`,
            stackStartFunction: Assert.fail
        });
    }

    private static _compare(act: any, exp: any): boolean {
        if (act instanceof Date && exp instanceof Date) {
            if (Math.abs(act.getTime() - exp.getTime()) > 200) {
                return false;
            }
        }
        else if (act instanceof Object) {
            if (!(exp instanceof Object)) {
                return false;
            }
            for (const key of Object.keys(act)) {
                if (!Assert._compare(act[key], exp[key])) {
                    return false;
                }
            }
        }
        else if (exp instanceof Object) {
            if (!(act instanceof Object)) {
                return false;
            }
            for (const key of Object.keys(exp)) {
                if (!Assert._compare(act[key], exp[key])) {
                    return false;
                }
            }
        }
        else {
            if (act !== exp) {
                return false;
            }
        }

        return true;
    }
}