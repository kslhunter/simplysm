/**
 * 테스트 유틸리티
 * - toMatchSql matcher
 * - dialects 상수
 * - ExpectedSql 타입
 */
import { expect } from "vitest";
import type { Dialect, QueryBuildResult } from "../../src/types/db";

// ============================================
// Dialect 목록
// ============================================

export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];

// ============================================
// Expected SQL 타입
// ============================================

export type ExpectedSql = Record<Dialect, string>;

// ============================================
// SQL 정규화 (공백/빈줄 무시, 동적 이름 정규화)
// ============================================

function normalizeSql(sql: string): string {
  return (
    sql
      // 모든 공백(스페이스, 탭, 줄바꿈)을 완전히 제거
      .replace(/\s+/g, "")
      // 프로시저 이름 정규화 (SD + 32자리 hex) <-- 이제 PROC안씀 multistatement씀
      // .replace(/`SD[a-f0-9]{32}`/g, "`SD_PROC`")
      // .replace(/\[#SD[a-f0-9]{32}]/g, "[#SD_PROC]")
      // .replace(/\[SD[a-f0-9]{32}]/g, "[SD_PROC]")
      // .replace(/"SD[a-f0-9]{32}"/g, '"SD_PROC"')
      // 임시테이블 이름 정규화 (SD_TEMP_ + 32자리 hex)
      .replace(/`SD_TEMP_[a-f0-9]{32}`/g, "`SD_TEMP`")
      .replace(/\[SD_TEMP_[a-f0-9]{32}]/g, "[SD_TEMP]")
      .replace(/"SD_TEMP_[a-f0-9]{32}"/g, '"SD_TEMP"')
  );
}

// ============================================
// 커스텀 Matcher
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
      message: () => (pass ? `SQL이 일치합니다` : `SQL이 일치하지 않습니다`),
    };
  },
});

// 타입 선언
declare module "vitest" {
  interface Assertion<T> {
    toMatchSql(expected: string): T;
  }
  interface AsymmetricMatchersContaining {
    toMatchSql(expected: string): unknown;
  }
}
