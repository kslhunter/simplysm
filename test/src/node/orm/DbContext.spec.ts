import {
  Column,
  DbContext,
  ForeignKey,
  ForeignKeyTarget,
  IDbConnectionConfig,
  IDbMigration,
  Queryable,
  QueryUnit,
  Table
} from "@simplysm/sd-orm-common";
import { expect } from "chai";
import { NodeDbContextExecutor } from "@simplysm/sd-orm-node";
import * as sinon from "sinon";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { Type } from "@simplysm/sd-core-common";

// TODO: SdOrm 테스트로 변경

Logger.setConfig({
  console: { level: LoggerSeverity.debug }
});

class TestDbContext extends DbContext {
  public get schema(): { database: string; schema: string } {
    return { database: "TestDb", schema: "dbo" };
  }

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
  const test = (config: IDbConnectionConfig): void => {
    const dbContextExecutor = new NodeDbContextExecutor(config);
    const db = new TestDbContext(dbContextExecutor);

    describe(`(node) orm.DbContext [${config.dialect ?? "mssql"}]`, () => {
      describe("초기화", () => {
        it("초기화", async () => {
          const result = await db.connectWithoutTransactionAsync(async () => {
            return await db.initializeAsync(undefined, true);
          });
          expect(result).to.equal(true);
        });
      });

      describe("INSERT", () => {
        it("테이블에 데이터를 입력한다.", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test.insertAsync({
              name: "홍길동1"
            });
          });

          expect(result).to.deep.equal([
            {
              id: 1,
              name: "홍길동1"
            }
          ]);
        });

        it("AUTO INCREMENT 컬럼에도 값을 강제로 넣을 수 있다.", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test.insertAsync({
              id: 2,
              name: "홍길동2"
            });
          });

          expect(result).to.deep.equal([
            {
              id: 2,
              name: "홍길동2"
            }
          ]);
        });

        it("INSERT (PREPARE)", async () => {
          const spy = sinon.spy(dbContextExecutor, "executeDefsAsync");

          await db.connectAsync(async () => {
            db.test.insertPrepare({
              name: "홍길동3"
            });

            db.test.insertPrepare({
              name: "홍길동4"
            });

            await db.executePreparedAsync();
            expect(spy.callCount).to.equal(1);

            const result = await db.test
              .where((item) => [db.qh.in(item.id, [3, 4])])
              .resultAsync();
            expect(result).to.deep.equal([
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 4,
                name: "홍길동4"
              }
            ]);
          });
          spy.restore();
        });
      });

      describe("UPDATE", () => {
        it("테이블 데이터를 수정한다.", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .updateAsync({
                name: "홍길동01"
              });
          });

          expect(result).to.deep.equal([
            {
              id: 1,
              name: "홍길동01"
            }
          ]);
        });

        it("TOP", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .top(1)
                .updateAsync((item) => ({
                  name: new QueryUnit(String, db.qh.concat(item.name, "1"))
                }))
            ).to.deep.equal([{
              id: 1,
              name: "홍길동011"
            }]);
          });
        });

        it("JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .join(TestTable, "test", (qr, en) => qr)
                .where((item) => [db.qh.equal(item.id, item.test[0].id)])
                .updateAsync((item) => ({
                  name: db.qh.concat(item.test[0].name, "1")
                }))
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동0111"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동31"
              },
              {
                id: 4,
                name: "홍길동41"
              }
            ]);
          });
        });

        it("미리 지정된 FK 에 대해 JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
          await db.connectAsync(async () => {
            await db.child
              .insertAsync({
                parentId: 1,
                name: "홍길동01"
              });

            expect(
              await db.test
                .include((item) => item.children)
                .where((item) => [db.qh.equal(item.id, item.children[0].id)])
                .updateAsync((item) => ({
                  name: item.children[0].name
                }))
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01"
              }
            ]);
          });
        });
      });

      describe("UPSERT", () => {
        it("INSERT", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test
              .where((item) => [
                db.qh.equal(item.id, 5)
              ])
              .upsertAsync({
                name: "홍길동5"
              });
          });

          expect(result).to.deep.equal([
            {
              id: 5,
              name: "홍길동5"
            }
          ]);
        });

        it("UPDATE", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test
              .where((item) => [
                db.qh.equal(item.id, 4)
              ])
              .upsertAsync({
                name: "홍길동04"
              });
          });

          expect(result).to.deep.equal([
            {
              id: 4,
              name: "홍길동04"
            }
          ]);
        });
      });

      describe("DELETE", () => {
        it("테이블 데이터를 삭제한다.", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test
              .where((item) => [
                db.qh.equal(item.id, 5)
              ])
              .deleteAsync();
          });

          expect(result).to.deep.equal([
            {
              id: 5,
              name: "홍길동5"
            }
          ]);
        });

        it("TOP", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.child
                .top(1)
                .deleteAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01",
                parentId: 1
              }
            ]);
          });
        });

        it("JOIN + WHERE", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .join(TestTable, "test", (qr, en) => qr)
                .where((item) => [db.qh.equal(item.id, item.test[0].id)])
                .where((item) => [db.qh.equal(item.id, 3)])
                .deleteAsync()
            ).to.deep.equal([
              {
                id: 3,
                name: "홍길동31"
              }
            ]);


            //복구

            await db.test
              .insertAsync({
                id: 3,
                name: "홍길동3"
              });
          });
        });

        it("INCLUDE + WHERE", async () => {
          await db.connectAsync(async () => {
            await db.child
              .insertAsync({
                id: 1,
                parentId: 1,
                name: "홍길동01"
              });

            expect(
              await db.child
                .include((item) => item.parent)
                .where((item) => [db.qh.equal(item.id, item.parent.id)])
                .deleteAsync()
            ).to.deep.equal([
              {
                id: 1,
                parentId: 1,
                name: "홍길동01"
              }
            ]);
          });
        });
      });

      describe("SELECT", () => {
        it("기본적으로 테이블을 조회한다", async () => {
          const result = await db.connectAsync(async () => {
            return await db.test.resultAsync();
          });

          expect(result).to.deep.equal([
            {
              id: 1,
              name: "홍길동01"
            },
            {
              id: 2,
              name: "홍길동21"
            },
            {
              id: 3,
              name: "홍길동3"
            },
            {
              id: 4,
              name: "홍길동04"
            }
          ]);
        });

        it("SELECT", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .select((item) => ({
                  id1: item.id
                }))
                .resultAsync()
            ).to.deep.equal([
              { id1: 1 },
              { id1: 2 },
              { id1: 3 },
              { id1: 4 }
            ]);
          });
        });

        it("SELECT 안에 서브쿼리를 넣을 수 있다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .select((item) => ({
                  id1: new QueryUnit(Number, db.test.top(1).select((item1) => ({ id2: item1.id })))
                }))
                .resultAsync()
            ).to.deep.equal([
              { id1: 1 },
              { id1: 1 },
              { id1: 1 },
              { id1: 1 }
            ]);
          });
        });

        it("WRAP: 기존 Queryable 이 FROM 안에 서브 쿼리로 들어간다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .wrap()
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 4,
                name: "홍길동04"
              }
            ]);
          });
        });

        it("FROM 안에 다수의 서브쿼리를 넣어 UNION ALL 할 수 있다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await Queryable.union([
                db.test,
                db.test,
                db.test
              ]).resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 4,
                name: "홍길동04"
              },
              {
                id: 1,
                name: "홍길동01"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 4,
                name: "홍길동04"
              },
              {
                id: 1,
                name: "홍길동01"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 4,
                name: "홍길동04"
              }
            ]);
          });
        });

        it("WHERE", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .where((item) => [
                  db.qh.equal(item.id, 3)
                ])
                .resultAsync()
            ).to.deep.equal([
              {
                id: 3,
                name: "홍길동3"
              }
            ]);
          });
        });

        it("WHERE 안에 서브쿼리를 넣을 수 있다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .where((item) => [
                  db.qh.equal(item.id, new QueryUnit(Number, db.test.top(1).select((item1) => ({ id: item1.id }))))
                ])
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01"
              }
            ]);
          });
        });

        it("DISTINCT", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .select(() => ({
                  id: 1
                }))
                .resultAsync()
            ).to.deep.equal([
              { id: 1 }, { id: 1 }, { id: 1 }, { id: 1 }
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
          await db.connectAsync(async () => {
            expect(
              await db.test
                .top(2)
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01"
              },
              {
                id: 2,
                name: "홍길동21"
              }
            ]);
          });
        });

        it("ORDER BY", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .orderBy((item) => item.id, true)
                .resultAsync()
            ).to.deep.equal([
              {
                id: 4,
                name: "홍길동04"
              },
              {
                id: 3,
                name: "홍길동3"
              },
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 1,
                name: "홍길동01"
              }
            ]);
          });
        });

        it("LIMIT", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .orderBy((item) => item.id)
                .limit(1, 2)
                .resultAsync()
            ).to.deep.equal([
              {
                id: 2,
                name: "홍길동21"
              },
              {
                id: 3,
                name: "홍길동3"
              }
            ]);
          });
        });

        it("GROUP BY", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .groupBy((item) => [
                  item.name
                ])
                .select(() => ({
                  cnt: db.qh.count()
                }))
                .resultAsync()
            ).to.deep.equal([
              { cnt: 1 }, { cnt: 1 }, { cnt: 1 }, { cnt: 1 }
            ]);
          });
        });

        it("HAVING", async () => {
          await db.connectAsync(async () => {
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
              {
                id: 1,
                name: "홍길동01"
              }
            ]);
          });
        });

        it("JOIN 된 테이블에 대해 SELECT 를 재구성 할 수 있다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .join(TestTable, "tests", (qr, item) => qr)
                .select((item) => ({
                  id: item.id,
                  tt: item.tests.map((item1) => ({
                    id1: item1.id
                  }))
                }))
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }, { id1: 4 }]
              },
              {
                id: 2,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }, { id1: 4 }]
              },
              {
                id: 3,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }, { id1: 4 }]
              },
              {
                id: 4,
                tt: [{ id1: 1 }, { id1: 2 }, { id1: 3 }, { id1: 4 }]
              }
            ]);
          });
        });

        it("JOIN시 TOP 및 Single 지정 가능", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .join(TestTable, "test", (qr, item) => qr.top(1), true)
                .select((item) => ({
                  id: item.id,
                  id1: item.test.id
                }))
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                id1: 1
              },
              {
                id: 2,
                id1: 1
              },
              {
                id: 3,
                id1: 1
              },
              {
                id: 4,
                id1: 1
              }
            ]);
          });
        });

        it("JOIN 시, UNION ALL 사용이 가능하다.", async () => {
          await db.connectAsync(async () => {
            expect(
              await db.test
                .join(
                  [
                    db.test, db.test, db.test
                  ],
                  "test",
                  (qr, item) => qr
                )
                .resultAsync()
            ).to.deep.equal([
              {
                id: 1,
                name: "홍길동01",
                test: [
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" }
                ]
              },
              {
                id: 2,
                name: "홍길동21",
                test: [
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" }
                ]
              },
              {
                id: 3,
                name: "홍길동3",
                test: [
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" }
                ]
              },
              {
                id: 4,
                name: "홍길동04",
                test: [
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" },
                  { id: 1, name: "홍길동01" },
                  { id: 2, name: "홍길동21" },
                  { id: 3, name: "홍길동3" },
                  { id: 4, name: "홍길동04" }
                ]
              }
            ]);
          });
        });

        it("미리 지정한 다른 테이블의 부모 데이터를 JOIN 할 수 있다", async () => {
          await db.connectAsync(async () => {
            await db.child
              .insertAsync({
                id: 10,
                parentId: 1,
                name: "자식01"
              });

            const result = await db.child
              .where((item) => [
                db.qh.equal(item.id, 10)
              ])
              .include((item) => item.parent)
              .resultAsync();

            expect(result).to.deep.equal([
              {
                id: 10,
                name: "자식01",
                parent: {
                  id: 1,
                  name: "홍길동01"
                },
                parentId: 1
              }
            ]);
          });
        });

        it("미리 지정한 다른 테이블의 자식 데이터 목록을 JOIN 할 수 있다", async () => {
          await db.connectAsync(async () => {
            await db.child
              .insertAsync({
                id: 11,
                parentId: 1,
                name: "자식02"
              });

            const result = await db.test
              .where((item) => [
                db.qh.equal(item.id, 1)
              ])
              .include((item) => item.children)
              .resultAsync();

            expect(result).to.deep.equal([
              {
                id: 1,
                name: "홍길동01",
                children: [
                  {
                    id: 10,
                    parentId: 1,
                    name: "자식01"
                  },
                  {
                    id: 11,
                    parentId: 1,
                    name: "자식02"
                  }
                ]
              }
            ]);
          });
        });

        it("동일한 SELECT 2회이상 반복 수행시, 한번만 결과물을 호출한다. 중간에 INSERT 등이 호출되면 반복 수행이 아닌것으로 본다.", async () => {
          const spy = sinon.spy(dbContextExecutor, "executeDefsAsync");

          await db.connectAsync(async () => {
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

            await db.test
              .insertAsync({
                name: "홍길동05"
              });

            await db.test
              .where((item) => [
                db.qh.equal(item.id, 2)
              ])
              .resultAsync();
          });

          expect(spy.callCount).to.equal(4);
        });

        it("SEARCH", async () => {
          await db.connectAsync(async () => {
            await db.searchTest.insertAsync({
              name1: "가나 다라마바사아자차카타파하",
              name2: "가나 다라마바사아자차카타파하"
            });
            await db.searchTest.insertAsync({
              name1: "가나다라마바사아자차카타파하",
              name2: "가나다라마바사아자차카타파하"
            });

            const result = await db.searchTest
              .search((item) => [item.name1, item.name2], "가나 다라")
              .resultAsync();

            expect(result).to.deep.equal([
              {
                __searchOrder: 20204,
                id: 1,
                name1: "가나 다라마바사아자차카타파하",
                name2: "가나 다라마바사아자차카타파하"
              },
              {
                __searchOrder: 204,
                id: 2,
                name1: "가나다라마바사아자차카타파하",
                name2: "가나다라마바사아자차카타파하"
              }
            ]);
          });
        });
      });

      describe("BULK INSERT", () => {
        it("테이블에 데이터를 입력한다.", async () => {
          if (db.dialect === "mysql") return;

          await db.connectAsync(async () => {
            await db.test.bulkInsertAsync(...[
              { id: 10, name: "홍길동10" },
              { id: 11, name: "홍길동11" },
              { id: 12, name: "홍길동12" },
              { id: 13, name: "홍길동13" }
            ]);

            const cnt = await db.test
              .where((item) => [
                db.qh.in(item.id, [10, 11, 12, 13])
              ])
              .countAsync();

            expect(cnt).to.equal(4);
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
});