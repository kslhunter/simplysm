import {
  Column,
  DbContext,
  ForeignKey,
  ForeignKeyTarget,
  IDbMigration,
  Queryable,
  QueryUnit,
  sorm,
  Table
} from "@simplysm/sd-orm-common";
import {expect} from "chai";
import {NodeDbContextExecutor} from "@simplysm/sd-orm-node";
import {Type} from "@simplysm/sd-core-common";
import * as sinon from "sinon";

class TestDbContext extends DbContext {
  public get schema(): { database: string; schema: string } {
    return {database: "TestDb", schema: "dbo"};
  }

  public get migrations(): Type<IDbMigration>[] {
    return [];
  }

  public test = new Queryable(this, TestTable);
  public child = new Queryable(this, ChildTable);
  public searchTest = new Queryable(this, SearchTestTable);
}

@Table({description: "테스트 테이블"})
class TestTable {
  @Column({description: "아이디", primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column({description: "명칭"})
  public name!: string;

  //-----------------
  @ForeignKeyTarget(() => ChildTable, "parent", "자식 목록")
  public children?: ChildTable[];
}

@Table({description: "조인 자식 테스트 테이블"})
class ChildTable {
  @Column({description: "아이디", primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column({description: "부모 아이디", nullable: true})
  public parentId?: number;

  @Column({description: "명칭"})
  public name!: string;

  //-----------------
  @ForeignKey(["parentId"], () => TestTable, "부모")
  public parent?: TestTable;
}


@Table({description: "검색 테스트 테이블"})
class SearchTestTable {
  @Column({description: "아이디", primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column({description: "명칭1"})
  public name1!: string;

  @Column({description: "명칭2"})
  public name2!: string;
}

const dbContextExecutor = new NodeDbContextExecutor({
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "1234"
});

const dbContext = new TestDbContext(dbContextExecutor);

describe("(node) orm.DbContext", () => {
  describe("초기화", () => {
    it("초기화", async () => {
      const result = await dbContext.connectWithoutTransactionAsync(async () => {
        return await dbContext.initializeAsync(undefined, true);
      });
      expect(result).to.equal(true);
    });
  });

  describe("INSERT", () => {
    it("테이블에 데이터를 입력한다.", async () => {
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test.insertAsync({
          name: "홍길동1"
        });
      });

      expect(result).to.deep.equal({
        id: 1,
        name: "홍길동1"
      });
    });

    it("AUTO INCREMENT 컬럼에도 값을 강제로 넣을 수 있다.", async () => {
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test.insertAsync({
          id: 2,
          name: "홍길동2"
        });
      });

      expect(result).to.deep.equal({
        id: 2,
        name: "홍길동2"
      });
    });

    it("INSERT (PREPARE)", async () => {
      const spy = sinon.spy(dbContextExecutor, "executeDefsAsync");

      await dbContext.connectAsync(async () => {
        dbContext.test.insertPrepare({
          name: "홍길동3"
        });

        dbContext.test.insertPrepare({
          name: "홍길동4"
        });

        const result = await dbContext.executePreparedAsync();

        expect(result).to.deep.equal([
          [ // 첫번째 Prepare
            {
              id: 3,
              name: "홍길동3"
            }
          ],
          [ // 두번째 Prepare
            {
              id: 4,
              name: "홍길동4"
            }
          ]
        ]);
      });
      expect(spy.callCount).to.equal(1);
      spy.restore();
    });
  });

  describe("UPDATE", () => {
    it("테이블 데이터를 수정한다.", async () => {
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .top(1)
            .updateAsync(item => ({
              name: new QueryUnit(String, [item.name, " + '1'"])
            }))
        ).to.deep.equal([{
          id: 1,
          name: "홍길동011"
        }]);
      });
    });

    it("JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .join(TestTable, "test", (qr, en) => qr)
            .where(item => [sorm.equal(item.id, item.test[0].id)])
            .updateAsync(item => ({
              name: item.test[0].name
            }))
        ).to.deep.equal([
          {
            id: 1,
            name: "홍길동011"
          },
          {
            id: 2,
            name: "홍길동2"
          },
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
    });

    it("미리 지정된 FK 에 대해 JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", async () => {
      await dbContext.connectAsync(async () => {
        await dbContext.child
          .insertAsync({
            parentId: 1,
            name: "홍길동01"
          });

        expect(
          await dbContext.test
            .include(item => item.children)
            .where(item => [sorm.equal(item.id, item.children[0].id)])
            .updateAsync(item => ({
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
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test
          .where(item => [
            sorm.equal(item.id, 5)
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
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test
          .where(item => [
            sorm.equal(item.id, 4)
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
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test
          .where(item => [
            sorm.equal(item.id, 5)
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.child
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .join(TestTable, "test", (qr, en) => qr)
            .where(item => [sorm.equal(item.id, item.test[0].id)])
            .where(item => [sorm.equal(item.id, 3)])
            .deleteAsync()
        ).to.deep.equal([
          {
            id: 3,
            name: "홍길동3"
          }
        ]);


        //복구

        await dbContext.test
          .insertAsync({
            id: 3,
            name: "홍길동3"
          });
      });
    });

    it("INCLUDE + WHERE", async () => {
      await dbContext.connectAsync(async () => {
        await dbContext.child
          .insertAsync({
            id: 1,
            parentId: 1,
            name: "홍길동01"
          });

        expect(
          await dbContext.child
            .include(item => item.parent)
            .where(item => [sorm.equal(item.id, item.parent.id)])
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
      const result = await dbContext.connectAsync(async () => {
        return await dbContext.test.resultAsync();
      });

      expect(result).to.deep.equal([
        {
          id: 1,
          name: "홍길동01"
        },
        {
          id: 2,
          name: "홍길동2"
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .select(item => ({
              id1: item.id
            }))
            .resultAsync()
        ).to.deep.equal([
          {id1: 1},
          {id1: 2},
          {id1: 3},
          {id1: 4}
        ]);
      });
    });

    it("SELECT 안에 서브쿼리를 넣을 수 있다.", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .select(item => ({
              id1: new QueryUnit(Number, dbContext.test.top(1).select(item1 => ({id2: item1.id})))
            }))
            .resultAsync()
        ).to.deep.equal([
          {id1: 1},
          {id1: 1},
          {id1: 1},
          {id1: 1}
        ]);
      });
    });

    it("WRAP: 기존 Queryable 이 FROM 안에 서브 쿼리로 들어간다.", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .wrap()
            .resultAsync()
        ).to.deep.equal([
          {
            id: 1,
            name: "홍길동01"
          },
          {
            id: 2,
            name: "홍길동2"
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
      await dbContext.connectAsync(async () => {
        expect(
          await Queryable.union([
            dbContext.test,
            dbContext.test,
            dbContext.test
          ]).resultAsync()
        ).to.deep.equal([
          {
            id: 1,
            name: "홍길동01"
          },
          {
            id: 2,
            name: "홍길동2"
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
            name: "홍길동2"
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
            name: "홍길동2"
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .where(item => [
              sorm.equal(item.id, 3)
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .where(item => [
              sorm.equal(item.id, new QueryUnit(Number, dbContext.test.top(1).select(item1 => ({id: item1.id}))))
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .select(() => ({
              id: 1
            }))
            .resultAsync()
        ).to.deep.equal([
          {id: 1}, {id: 1}, {id: 1}, {id: 1}
        ]);

        expect(
          await dbContext.test
            .select(() => ({
              id: 1
            }))
            .distinct()
            .resultAsync()
        ).to.deep.equal([
          {id: 1}
        ]);
      });
    });

    it("TOP", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .top(2)
            .resultAsync()
        ).to.deep.equal([
          {
            id: 1,
            name: "홍길동01"
          },
          {
            id: 2,
            name: "홍길동2"
          }
        ]);
      });
    });

    it("ORDER BY", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .orderBy(item => item.id, true)
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
            name: "홍길동2"
          },
          {
            id: 1,
            name: "홍길동01"
          }
        ]);
      });
    });

    it("LIMIT", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .orderBy(item => item.id)
            .limit(1, 2)
            .resultAsync()
        ).to.deep.equal([
          {
            id: 2,
            name: "홍길동2"
          },
          {
            id: 3,
            name: "홍길동3"
          }
        ]);
      });
    });

    it("GROUP BY", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .groupBy(item => [
              item.name
            ])
            .select(() => ({
              cnt: sorm.count()
            }))
            .resultAsync()
        ).to.deep.equal([
          {cnt: 1}, {cnt: 1}, {cnt: 1}, {cnt: 1}
        ]);
      });
    });

    it("HAVING", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .groupBy(item => [
              item.id,
              item.name
            ])
            .having(item => [
              sorm.equal(item.id, 1)
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
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .join(TestTable, "tests", (qr, item) => qr)
            .select(item => ({
              id: item.id,
              tt: item.tests.map(item1 => ({
                id1: item1.id
              }))
            }))
            .resultAsync()
        ).to.deep.equal([
          {
            id: 1,
            tt: [{id1: 1}, {id1: 2}, {id1: 3}, {id1: 4}]
          },
          {
            id: 2,
            tt: [{id1: 1}, {id1: 2}, {id1: 3}, {id1: 4}]
          },
          {
            id: 3,
            tt: [{id1: 1}, {id1: 2}, {id1: 3}, {id1: 4}]
          },
          {
            id: 4,
            tt: [{id1: 1}, {id1: 2}, {id1: 3}, {id1: 4}]
          }
        ]);
      });
    });

    it("JOIN 시, UNION ALL 사용이 가능하다.", async () => {
      await dbContext.connectAsync(async () => {
        expect(
          await dbContext.test
            .join(
              [
                dbContext.test, dbContext.test, dbContext.test
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
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"}
            ]
          },
          {
            id: 2,
            name: "홍길동2",
            test: [
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"}
            ]
          },
          {
            id: 3,
            name: "홍길동3",
            test: [
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"}
            ]
          },
          {
            id: 4,
            name: "홍길동04",
            test: [
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"},
              {id: 1, name: "홍길동01"},
              {id: 2, name: "홍길동2"},
              {id: 3, name: "홍길동3"},
              {id: 4, name: "홍길동04"}
            ]
          }
        ]);
      });
    });

    it("미리 지정한 다른 테이블의 부모 데이터를 JOIN 할 수 있다", async () => {
      await dbContext.connectAsync(async () => {
        await dbContext.child
          .insertAsync({
            id: 10,
            parentId: 1,
            name: "자식01"
          });

        const result = await dbContext.child
          .where(item => [
            sorm.equal(item.id, 10)
          ])
          .include(item => item.parent)
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
      await dbContext.connectAsync(async () => {
        await dbContext.child
          .insertAsync({
            id: 11,
            parentId: 1,
            name: "자식02"
          });

        const result = await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
          ])
          .include(item => item.children)
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

      await dbContext.connectAsync(async () => {
        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
          ])
          .resultAsync();

        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
          ])
          .resultAsync();

        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
          ])
          .resultAsync();

        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 1)
          ])
          .resultAsync();

        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 2)
          ])
          .resultAsync();

        await dbContext.test
          .insertAsync({
            name: "홍길동05"
          });

        await dbContext.test
          .where(item => [
            sorm.equal(item.id, 2)
          ])
          .resultAsync();
      });

      expect(spy.callCount).to.equal(4);
    });

    it("SEARCH", async () => {
      await dbContext.connectAsync(async () => {
        await dbContext.searchTest.insertAsync({
          name1: "가나 다라마바사아자차카타파하",
          name2: "가나 다라마바사아자차카타파하"
        });
        await dbContext.searchTest.insertAsync({
          name1: "가나다라마바사아자차카타파하",
          name2: "가나다라마바사아자차카타파하"
        });

        const result = await dbContext.searchTest
          .search(item => [item.name1, item.name2], "가나 다라")
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
});
