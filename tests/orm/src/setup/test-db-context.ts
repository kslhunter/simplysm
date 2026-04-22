import { DbContext } from "@simplysm/orm-common";
import type { createModels } from "./models";

/**
 * 통합 테스트용 DbContext 서브클래스
 *
 * models는 static 필드에 주입된 후, 인스턴스 생성 시 참조된다.
 * TS4094 회피를 위해 named class로 export 한다.
 */
export class TestDb extends DbContext {
  /** dialect별 models를 보관하는 static 필드. createTestDb()로 설정 */
  static models: ReturnType<typeof createModels>;

  private readonly _models = (this.constructor as typeof TestDb).models;

  company = this.queryable(this._models.Company);
  user = this.queryable(this._models.User);
  post = this.queryable(this._models.Post);
  employee = this.queryable(this._models.Employee);
  sales = this.queryable(this._models.Sales);
  monthlySales = this.queryable(this._models.MonthlySales);
}

/**
 * dialect별로 models를 주입한 TestDb 서브클래스를 반환한다.
 *
 * static models 공유로 인한 dialect 간 간섭을 방지하기 위해
 * 매번 새 서브클래스를 생성한다.
 */
export function createTestDb(
  models: ReturnType<typeof createModels>,
): typeof TestDb {
  return class extends TestDb {
    static override models = models;
  };
}
