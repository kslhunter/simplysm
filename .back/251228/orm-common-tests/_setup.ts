/**
 * 테스트 공통 설정
 */
import "@simplysm/sd-core-common";
import { expect } from "vitest";
import { DbContext } from "../src/db-context";
import { User } from "./models/User";
import { Post } from "./models/Post";
import { Company } from "./models/Company";
import { Order } from "./models/Order";
import { UserBackup } from "./models/UserBackup";
import { Sales } from "./models/Sales";
import { MonthlySales } from "./models/MonthlySales";

// ============================================
// SQL 정규화 (공백/빈줄 무시, 동적 이름 정규화)
// ============================================

function normalizeSql(sql: string): string {
  return (
    sql
      // .split("\n")
      // .map((line) => line.trim())
      // .filter((line) => line.length > 0)
      // .join(" ")
      // .replace(/\s+/g, " ")
      .replace(/\s+\n/g, "\n")
      // 프로시저 이름 정규화 (SD + 32자리 hex)
      .replace(/`SD[a-f0-9]{32}`/g, "`SD_PROC`")
      .replace(/\[#SD[a-f0-9]{32}]/g, "[#SD_PROC]")
      .replace(/\[SD[a-f0-9]{32}]/g, "[SD_PROC]")
      .replace(/"SD[a-f0-9]{32}"/g, '"SD_PROC"')
      // 임시테이블 이름 정규화 (SD_TEMP_ + 32자리 hex)
      .replace(/`SD_TEMP_[a-f0-9]{32}`/g, "`SD_TEMP`")
      .replace(/\[SD_TEMP_[a-f0-9]{32}]/g, "[SD_TEMP]")
      .replace(/"SD_TEMP_[a-f0-9]{32}"/g, '"SD_TEMP"')
      .trim()
  );
}

// ============================================
// 커스텀 Matcher
// ============================================

expect.extend({
  toMatchSql(received: string, expected: string) {
    const normalizedReceived = normalizeSql(received);
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

// ============================================
// Mock Executor
// ============================================

export class MockExecutor implements IDbContextExecutor {
  // 연결 관리 (Mock - 아무것도 안 함)
  async connectAsync(): Promise<void> {}
  async closeAsync(): Promise<void> {}

  // 트랜잭션 (Mock - 아무것도 안 함)
  async beginTransactionAsync(): Promise<void> {}
  async commitTransactionAsync(): Promise<void> {}
  async rollbackTransactionAsync(): Promise<void> {}

  // 쿼리 실행
  async executeDefsAsync(
    _defs: TQueryDef[],
    _options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    return [[]];
  }

  async executeParametrizedAsync(_query: string, _params?: any[]): Promise<any[][]> {
    return [[]];
  }
}

// ============================================
// Test DbContext
// ============================================

export class TestDbContext extends DbContext {
  constructor(dialect: TDialect) {
    super(new MockExecutor(), {
      dialect,
      database: "TestDb",
    });
  }

  user = queryable(this, User);
  post = queryable(this, Post);
  company = queryable(this, Company);
  order = queryable(this, Order);
  userBackup = queryable(this, UserBackup);
  sales = queryable(this, Sales);
  monthlySales = queryable(this, MonthlySales);
}

// ============================================
// Dialect 목록
// ============================================

export const DIALECTS: TDialect[] = ["mysql", "mssql", "postgresql"];
