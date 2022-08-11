import {
  Column,
  DbContext,
  ForeignKey,
  ForeignKeyTarget,
  IDbMigration,
  Queryable,
  QueryUnit,
  Table,
  TDbConnectionConfig
} from "@simplysm/sd-orm-common";
import chai, { expect } from "chai";
import { SdOrm } from "@simplysm/sd-orm-node";
import * as sinon from "sinon";
import { Type } from "@simplysm/sd-core-common";
import deepEqualInAnyOrder from "deep-equal-in-any-order";
import path from "path";
import { fileURLToPath } from "url";
import { FsUtil } from "@simplysm/sd-core-node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

chai.use(deepEqualInAnyOrder);

class TestDbContext extends DbContext {
  public get migrations(): Type<IDbMigration>[] {
    return [];
  }

  public test = new Queryable(this, TestTable);
  public child = new Queryable(this, ChildTable);
  public searchTest = new Queryable(this, SearchTestTable);
}

@Table({ description: "테스트 테이블" })
class TestTable {
  @Column({ description: "아이디", primaryKey: 1, autoIncrement: true })
  public id?: number;

  @Column({ description: "명칭" })
  public name!: string;

  //-----------------
  @ForeignKeyTarget(() => ChildTable, "parent", "자식 목록")
  public children?: ChildTable[];
}

@Table({ description: "조인 자식 테스트 테이블" })
class ChildTable {
  @Column({ description: "아이디", primaryKey: 1, autoIncrement: true })
  public id?: number;

  @Column({ description: "부모 아이디", nullable: true })
  public parentId?: number;

  @Column({ description: "명칭" })
  public name!: string;

  //-----------------
  @ForeignKey(["parentId"], () => TestTable, "부모")
  public parent?: TestTable;
}


@Table({ description: "검색 테스트 테이블" })
class SearchTestTable {
  @Column({ description: "아이디", primaryKey: 1, autoIncrement: true })
  public id?: number;

  @Column({ description: "명칭1" })
  public name1!: string;

  @Column({ description: "명칭2" })
  public name2!: string;
}

describe(`(node) orm.DbContext`, () => {
  const test = (config: TDbConnectionConfig): void => {
    const orm = new SdOrm(TestDbContext, config, {
      dialect: config.dialect,
      ...config.dialect === "sqlite" ? {} : {
        database: "TestDb",
        schema: "dbo"
      }
    });

    describe(`(node) orm.DbContext [${config.dialect}]`, () => {
      describe("SELECT", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");

            await db.test.insertAsync([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
            await db.child.insertAsync([
              { id: 2, name: "홍길동2-1", parentId: 2 },
              { id: 3, name: "홍길동3-1", parentId: 3 },
              { id: 4, name: "홍길동3-2", parentId: 3 }
            ]);

            await db.searchTest.insertAsync([
              {
                id: 1,
                name1: "가나다라",
                name2: "나다라"
              },
              {
                id: 2,
                name1: "가라",
                name2: "가나라"
              }
            ]);
          });
        });

        it("기본적으로 테이블을 조회한다", async () => {
          await orm.connectAsync(async (db) => {
            await db.test.resultAsync();

            const result = await db.test.resultAsync();

            expect(result).to.deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("SELECT", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .select((item) => ({
                  id1: item.id
                }))
                .resultAsync()
            ).to.deep.equal([
              { id1: 1 },
              { id1: 2 },
              { id1: 3 }
            ]);
          });
        });

        it("SELECT 안에 서브쿼리를 넣을 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .select(() => ({
                  id1: new QueryUnit(Number, db.test.top(1).select((item1) => ({ id2: item1.id })))
                }))
                .resultAsync()
            ).to.deep.equal([
              { id1: 1 },
              { id1: 1 },
              { id1: 1 }
            ]);
          });
        });

        it("WRAP: 기존 Queryable 이 FROM 안에 서브 쿼리로 들어간다.", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .wrap()
                .resultAsync()
            ).to.deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("(UNION) FROM 안에 다수의 서브쿼리를 넣어 UNION ALL 할 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await Queryable.union([
                db.test,
                db.test,
                db.test
              ]).resultAsync()
            ).to.deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" },
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" },
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("WHERE", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .where((item) => [
                  db.qh.equal(item.id, 3)
                ])
                .resultAsync()
            ).to.deep.equal([
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("WHERE 안에 서브쿼리를 넣을 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .where((item) => [
                  db.qh.equal(item.id, new QueryUnit<number>(Number, db.test.top(1).select((item1) => ({ id: item1.id }))))
                ])
                .resultAsync()
            ).to.deep.equal([
              { id: 1, name: "홍길동1" }
            ]);
          });
        });

        it("DISTINCT", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .select(() => ({
                  id: 1
                }))
                .resultAsync()
            ).to.deep.equal([
              { id: 1 }, { id: 1 }, { id: 1 }
            ]);

            expect(
              await db.test
                .select(() => ({
                  id: 1
                }))
                .distinct()
                .resultAsync()
            ).to.deep.equal([
              { id: 1 }
            ]);
          });
        });

        it("TOP", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .top(2)
                .resultAsync()
            ).to.deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" }
            ]);
          });
        });

        it("ORDER BY", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .orderBy((item) => item.id, true)
                .resultAsync()
            ).to.deep.equal([
              { id: 3, name: "홍길동3" },
              { id: 2, name: "홍길동2" },
              { id: 1, name: "홍길동1" }
            ]);
          });
        });

        it("LIMIT", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .orderBy((item) => item.id)
                .limit(1, 2)
                .resultAsync()
            ).to.deep.equal([
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("GROUP BY", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .groupBy((item) => [item.name])
                .select(() => ({ cnt: db.qh.count() }))
                .resultAsync()
            ).to.deep.equal([
              { cnt: 1 }, { cnt: 1 }, { cnt: 1 }
            ]);
          });
        });

        it("HAVING", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .groupBy((item) => [
                  item.id,
                  item.name
                ])
                .having((item) => [
                  db.qh.equal(item.id, 1)
                ])
                .resultAsync()
            ).to.deep.equal([
              { id: 1, name: "홍길동1" }
            ]);
          });
        });

        it("JOIN 된 테이블에 대해 SELECT 를 재구성 할 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .join(TestTable, "tests", (qr, en) => qr)
                .select((item) => ({
                  id: item.id,
                  tt: item.tests.map((item1) => ({
                    id1: item1.id
                  }))
                }))
                .resultAsync()
            ).to.deep.equalInAnyOrder([
              {
                id: 1,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }]
              },
              {
                id: 2,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }]
              },
              {
                id: 3,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }]
              }
            ]);
          });
        });

        it("JOIN시 TOP 및 Single 지정 가능", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .joinSingle(TestTable, "test", (qr, en) => qr.top(1))
                .select((item) => ({
                  id: item.id,
                  id1: item.test.id
                }))
                .resultAsync()
            ).to.deep.equal([
              { id: 1, id1: 1 },
              { id: 2, id1: 1 },
              { id: 3, id1: 1 }
            ]);
          });
        });

        it("JOIN 시, UNION ALL 사용이 가능하다. (이때 JOIN된 Queryable에는 자동으로 distinct 가 적용된다)", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.test
                .join(
                  [db.test, db.test, db.test],
                  "test",
                  (qr, en) => qr
                )
                .resultAsync()
            ).to.deep.equalInAnyOrder([
              {
                id: 1,
                name: "홍길동1",
                test: [
                  { id: 1, name: "홍길동1" },
                  { id: 2, name: "홍길동2" },
                  { id: 3, name: "홍길동3" }
                ]
              },
              {
                id: 2,
                name: "홍길동2",
                test: [
                  { id: 1, name: "홍길동1" },
                  { id: 2, name: "홍길동2" },
                  { id: 3, name: "홍길동3" }
                ]
              },
              {
                id: 3,
                name: "홍길동3",
                test: [
                  { id: 1, name: "홍길동1" },
                  { id: 2, name: "홍길동2" },
                  { id: 3, name: "홍길동3" }
                ]
              }
            ]);
          });
        });

        it("미리 지정한 다른 테이블의 부모 데이터를 JOIN 할 수 있다", async () => {
          await orm.connectAsync(async (db) => {
            const result = await db.child
              .where((item) => [
                db.qh.equal(item.id, 2)
              ])
              .include((item) => item.parent)
              .resultAsync();

            expect(result).to.deep.equal([
              {
                id: 2,
                name: "홍길동2-1",
                parent: {
                  id: 2,
                  name: "홍길동2"
                },
                parentId: 2
              }
            ]);
          });
        });

        it("미리 지정한 다른 테이블의 자식 데이터 목록을 JOIN 할 수 있다", async () => {
          await orm.connectAsync(async (db) => {
            const result = await db.test
              .where((item) => [
                db.qh.equal(item.id, 3)
              ])
              .include((item) => item.children)
              .resultAsync();

            expect(result).to.deep.equal([
              {
                id: 3,
                name: "홍길동3",
                children: [
                  {
                    id: 3,
                    parentId: 3,
                    name: "홍길동3-1"
                  },
                  {
                    id: 4,
                    parentId: 3,
                    name: "홍길동3-2"
                  }
                ]
              }
            ]);
          });
        });

        it("(캐싱) 동일한 SELECT 1초 내에 반복 수행시, 한번만 쿼리을 호출한다. 중간에 INSERT 등이 호출되면 반복 수행이 아닌것으로 본다.", async () => {
          await orm.connectAsync(async (db) => {
            const spy = sinon.spy(db, "executeDefsAsync");

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .resultAsync();

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .resultAsync();

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .resultAsync();

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .resultAsync();

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 2)
              ])
              .resultAsync();

            await db.test.insertAsync([{ name: "홍길동4" }]);

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 2)
              ])
              .resultAsync();

            expect(spy.callCount).to.equal(4);
          });
        });

        it("SEARCH", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.searchTest
                .search((item) => [item.name1, item.name2], "가")
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name1: "가나다라",
                name2: "나다라"
              },
              {
                id: 2,
                name1: "가라",
                name2: "가나라"
              }
            ]);

            expect(
              await db.searchTest
                .search((item) => [item.name1, item.name2], "가라")
                .resultAsync()
            ).to.deep.equal([
              {
                id: 2,
                name1: "가라",
                name2: "가나라"
              }
            ]);

            expect(
              await db.searchTest
                .search((item) => [item.name1, item.name2], "가 다")
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name1: "가나다라",
                name2: "나다라"
              }
            ]);
          });
        });


        it("SEARCH (&)", async () => {
          await orm.connectAsync(async (db) => {
            expect(
              await db.searchTest
                .search((item) => [item.name1, item.name2], "가 다")
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name1: "가나다라",
                name2: "나다라"
              }
            ]);
          });
        });
      });

      describe("INSERT", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");
          });
        });

        it("테이블에 데이터를 입력한다.", async () => {
          await orm.connectAsync(async (db) => {
            await db.test.insertAsync([{
              name: "홍길동"
            }]);

            const newItem = await db.test.singleAsync();
            expect(newItem?.name).equal("홍길동");
          });
        });

        it("테이블에 새로 입력한 데이터의 특정 컬럼값을 가져올 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            const result = await db.test.insertAsync([{
              name: "홍길동"
            }], ["id"]);

            expect(result).deep.equal([{ id: 1 }]);
          });
        });

        it("AUTO INCREMENT 컬럼에도 값을 강제로 넣을 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            await db.test.insertAsync([{
              id: 100,
              name: "홍길동"
            }]);

            const newItem = await db.test.singleAsync();

            expect(newItem?.id).equal(100);
            expect(newItem?.name).equal("홍길동");
          });
        });

        it("INSERT (PREPARE)", async () => {
          await orm.connectAsync(async (db) => {
            const spy = sinon.spy(db, "executeDefsAsync");

            db.test.insertPrepare([{ name: "홍길동1" }]);
            db.test.insertPrepare([{ name: "홍길동2" }]);

            await db.executePreparedAsync();
            expect(spy.callCount).to.equal(1);

            const result = await db.test.resultAsync();

            expect(result[0]?.name).equal("홍길동1");
            expect(result[1]?.name).equal("홍길동2");

            spy.restore();
          });
        });
      });

      describe("UPDATE", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");

            await db.test.insertAsync([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
            await db.child.insertAsync([
              { id: 1, name: "홍길동1-1", parentId: 1 }
            ]);
          });
        });

        it("테이블 데이터를 수정한다.", async () => {
          await orm.connectAsync(async (db) => {
            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .updateAsync(() => ({
                name: "홍길동01"
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동01" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("테이블에 수정 데이터의 특정 컬럼값을 가져올 수 있다.", async () => {
          await orm.connectAsync(async (db) => {
            const result = await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .updateAsync(() => ({
                name: "홍길동01"
              }), ["id"]);

            expect(result).deep.equal([{ id: 1 }]);
          });
        });

        it("TOP", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .top(1)
              .updateAsync((item) => ({
                name: new QueryUnit(String, db.qh.concat(item.name, "1"))
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동11" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .join(TestTable, "test", (qr, en) => qr)
              .where((item) => [
                db.qh.equal(item.test[0].id, 1),
                db.qh.equal(item.id, item.test[0].id)
              ])
              .updateAsync((item) => ({
                name: db.qh.concat(item.test[0].name, "1")
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동11" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("미리 지정된 FK 에 대해 JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .include((item) => item.children)
              .where((item) => [db.qh.isNotNull(item.children[0].id)])
              .updateAsync((item) => ({
                name: item.children[0].name
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동1-1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });
      });

      describe("UPSERT", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");

            await db.test.insertAsync([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("INSERT", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .where((item) => [
                db.qh.equal(item.name, "홍길동10")
              ])
              .upsertAsync(() => ({
                name: "홍길동10"
              }));

            const result = await db.test.resultAsync();

            expect(result.map((item) => item.name)).include("홍길동10");
          });
        });

        it("INSERT (with PK)", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .where((item) => [
                db.qh.equal(item.id, 10)
              ])
              .upsertAsync(() => ({
                name: "홍길동10"
              }), (record) => ({
                id: 10,
                ...record
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" },
              { id: 10, name: "홍길동10" }
            ]);
          });
        });

        it("UPDATE", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .upsertAsync(() => ({
                name: "홍길동11"
              }));

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동11" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });
      });

      describe("DELETE", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");

            await db.test.insertAsync([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
            await db.child.insertAsync([
              { id: 2, name: "홍길동2-1", parentId: 2 },
              { id: 3, name: "홍길동3-1", parentId: 3 }
            ]);
          });
        });

        it("테이블 데이터를 삭제한다.", async () => {
          await orm.connectAsync(async (db) => {
            await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .deleteAsync();

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("TOP", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .top(1)
              .deleteAsync();

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("JOIN + WHERE", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.test
              .join(TestTable, "test", (qr, en) => qr)
              .where((item) => [db.qh.equal(item.id, item.test[0].id)])
              .where((item) => [db.qh.equal(item.test[0].id, 1)])
              .deleteAsync();

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" }
            ]);
          });
        });

        it("INCLUDE + WHERE", async () => {
          if (config.dialect === "sqlite") return;

          await orm.connectAsync(async (db) => {
            await db.child
              .include((item) => item.parent)
              .where((item) => [db.qh.equal(item.parent.name, "홍길동2")])
              .deleteAsync();

            const result = await db.child.resultAsync();

            expect(result).deep.equal([
              { id: 3, name: "홍길동3-1", parentId: 3 }
            ]);
          });
        });
      });

      describe("BULK INSERT", () => {
        beforeEach(async () => {
          if (config.dialect === "sqlite") {
            await FsUtil.removeAsync(path.resolve(__dirname, "DbContextTestDir", "db.sqlite3"));
          }

          await orm.connectWithoutTransactionAsync(async (db) => {
            await db.initializeAsync(undefined, config.dialect !== "sqlite");
          });
        });

        it("테이블에 데이터를 입력한다.", async () => {
          await orm.connectAsync(async (db) => {
            await db.test.bulkInsertAsync([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" },
              { id: 4, name: "홍길동4" }
            ]);

            const result = await db.test.resultAsync();

            expect(result).deep.equal([
              { id: 1, name: "홍길동1" },
              { id: 2, name: "홍길동2" },
              { id: 3, name: "홍길동3" },
              { id: 4, name: "홍길동4" }
            ]);
          });
        });
      });
    });
  };

  test({
    dialect: "mssql",
    host: "localhost",
    port: 1433,
    username: "sa",
    password: "1234"
  });

  test({
    dialect: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "1234"
  });

  test({
    dialect: "sqlite",
    filePath: path.resolve(__dirname, "DbContextTestDir", "db.sqlite3")
  });
});
