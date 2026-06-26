import { Table } from "@simplysm/orm-common";

/**
 * 통합 테스트용 모델 팩토리
 *
 * DB별로 database/schema 설정이 다르므로 팩토리 패턴으로 생성
 *
 * 관계는 `.relations()` 체이닝으로 정의한다(TS5 작성법과 동일).
 * 무제약 제네릭 패턴으로 `() => typeof X` 타겟이 const 형성 중 eager 평가되지 않아
 * TS6 순환 const 없이 동작하며, include 의 다단계 관계 정밀도도 보존된다.
 */
export function createModels(opts: { database: string; schema?: string }) {
  /**
   * Table에 database/schema를 적용한다.
   * schema가 없으면 빈 문자열을 넣지 않고, database만 적용된 builder를 반환한다.
   */
  function applyOpts<TName extends string>(name: TName) {
    const builder = Table(name).database(opts.database);
    return opts.schema != null ? builder.schema(opts.schema) : builder;
  }

  const Company = applyOpts("Company")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(200),
    }))
    .primaryKey("id");

  const User = applyOpts("User")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(100),
      email: c.varchar(200).nullable(),
      age: c.int().nullable(),
      isActive: c.boolean().default(true),
      companyId: c.int().nullable(),
    }))
    .primaryKey("id")
    .relations((r) => ({
      company: r.foreignKey(["companyId"], () => Company),
    }));

  const Post = applyOpts("Post")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      userId: c.int(),
      title: c.varchar(300),
      content: c.text().nullable(),
      viewCount: c.int().default(0),
    }))
    .primaryKey("id")
    .relations((r) => ({
      user: r.foreignKey(["userId"], () => User),
    }));

  const Employee = applyOpts("Employee")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(100),
      salary: c.int(),
      departmentId: c.int().nullable(),
      managerId: c.int().nullable(),
    }))
    .primaryKey("id");

  const Sales = applyOpts("Sales")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      category: c.varchar(50),
      year: c.int(),
      amount: c.int(),
    }))
    .primaryKey("id");

  const MonthlySales = applyOpts("MonthlySales")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      category: c.varchar(50),
      jan: c.int(),
      feb: c.int(),
      mar: c.int(),
    }))
    .primaryKey("id");

  return { Company, User, Post, Employee, Sales, MonthlySales };
}
