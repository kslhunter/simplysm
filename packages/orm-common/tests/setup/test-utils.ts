/**
 * Test utilities
 * - toMatchSql matcher
 * - dialects constant
 * - ExpectedSql type
 */
import { expect } from "vitest";
import type { Dialect, QueryBuildResult } from "../../src/types/db";

// ============================================
// Dialect list
// ============================================

export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];

// ============================================
// Expected SQL type
// ============================================

export type ExpectedSql = Record<Dialect, string>;

// ============================================
// SQL normalization (ignore whitespace/empty lines, normalize dynamic names)
// ============================================

function normalizeSql(sql: string): string {
  return (
    sql
      // Completely remove all whitespace (spaces, tabs, newlines)
      .replace(/\s+/g, "")
      // Procedure name normalization (SD + 32-char hex) <-- now using multistatement instead of PROC
      // .replace(/`SD[a-f0-9]{32}`/g, "`SD_PROC`")
      // .replace(/\[#SD[a-f0-9]{32}]/g, "[#SD_PROC]")
      // .replace(/\[SD[a-f0-9]{32}]/g, "[SD_PROC]")
      // .replace(/"SD[a-f0-9]{32}"/g, '"SD_PROC"')
      // Temporary table name normalization (SD_TEMP_ + 32-char hex)
      .replace(/`SD_TEMP_[a-f0-9]{32}`/g, "`SD_TEMP`")
      .replace(/\[SD_TEMP_[a-f0-9]{32}]/g, "[SD_TEMP]")
      .replace(/"SD_TEMP_[a-f0-9]{32}"/g, '"SD_TEMP"')
  );
}

// ============================================
// Custom matcher
// ============================================

expect.extend({
  toMatchSql(received: string | QueryBuildResult, expected: string) {
    const sql = typeof received === "string" ? received : received.sql;
    const normalizedReceived = normalizeSql(sql);
    const normalizedExpected = normalizeSql(expected);

    const pass = normalizedReceived === normalizedExpected;

    return {
      pass,
      actual: normalizedReceived,
      expected: normalizedExpected,
      message: () => (pass ? "SQL matches" : "SQL does not match"),
    };
  },
});

// Type declaration
declare module "vitest" {
  interface Assertion<T> {
    toMatchSql(expected: string): T;
  }
  interface AsymmetricMatchersContaining {
    toMatchSql(expected: string): unknown;
  }
}
