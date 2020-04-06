import {expect} from "chai";
import {Column, Queryable, QueryUnit, sorm, Table} from "@simplysm/sd-orm-common";


@Table({description: "테스트 테이블", database: "TestDb", schema: "TestSchema"})
class TestTable {
  @Column({description: "아이디", primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column({description: "명칭"})
  public name!: string;
}

/*
class TestDbContext extends DbContext {
  public get schema(): { database: string; schema: string } {
    return {database: "TestDb", schema: "TestSchema"};
  }

  public get migrations(): Type<IDbMigration>[] {
    return [];
  }

  public test = new Queryable(this, TestTable);
}


const dbContext = new TestDbContext();*/

describe("(common) orm.Queryable (QueryableDef => QueryDef)", () => {
  describe("SELECT", () => {
    it("기본적으로 테이블을 조회한다", () => {
      expect(
        new Queryable(undefined, TestTable)
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("SELECT", () => {
      expect(
        new Queryable(undefined, TestTable)
          .select(item => ({
            id1: item.id
          }))
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id1]": "[TBL].[id]"
        }
      });
    });

    it("SELECT 안에 서브쿼리를 넣을 경우, 내부쿼리는 반드시 TOP 1 이 설정되어야 하고, 단 하나의 컬럼만 SELECT 되어야 한다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .select(item => ({
            id1: new QueryUnit(String, new Queryable(undefined, TestTable))
          }))
          .getSelectDef();
      }).to.throw(/TOP 1/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .select(item => ({
            id1: new QueryUnit(String, new Queryable(undefined, TestTable).top(1))
          }))
          .getSelectDef();
      }).to.throw(/하나/);
    });

    it("SELECT 안에 서브쿼리를 넣을 수 있다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .select(item => ({
            id1: new QueryUnit(String, new Queryable(undefined, TestTable).top(1).select(item1 => ({id2: item1.id})))
          }))
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id1]": {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL]",
            select: {
              "[id2]": "[TBL].[id]"
            },
            top: 1
          }
        }
      });
    });

    it("WRAP: 기존 Queryable 이 FROM 안에 서브 쿼리로 들어간다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .wrap()
          .getSelectDef()
      ).to.deep.equal({
        from: {
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]"
          }
        },
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("FROM 안에 다수의 서브쿼리를 넣어 UNION ALL 할 수 있다.", () => {
      expect(
        Queryable.union([
          new Queryable(undefined, TestTable),
          new Queryable(undefined, TestTable),
          new Queryable(undefined, TestTable)
        ]).getSelectDef()
      ).to.deep.equal({
        from: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL]",
            select: {
              "[id]": "[TBL].[id]",
              "[name]": "[TBL].[name]"
            }
          },
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL]",
            select: {
              "[id]": "[TBL].[id]",
              "[name]": "[TBL].[name]"
            }
          },
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL]",
            select: {
              "[id]": "[TBL].[id]",
              "[name]": "[TBL].[name]"
            }
          }
        ],
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("WHERE", () => {
      expect(
        new Queryable(undefined, TestTable)
          .where(item => [
            sorm.equal(item.id, undefined),
            sorm.equal(item.id, 3)
          ])
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        where: [
          ["[TBL].[id]", " IS ", "NULL"],
          " AND ",
          ["[TBL].[id]", " = ", 3]
        ]
      });
    });

    it("WHERE 안에 서브쿼리를 넣을 경우, 내부쿼리는 반드시 TOP 1 이 설정되어야 하고, 단 하나의 컬럼만 SELECT 되어야 한다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .where(item => [
            sorm.equal(item.id, new QueryUnit(Number, new Queryable(undefined, TestTable)))
          ])
          .getSelectDef();
      }).to.throw(/TOP 1/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .where(item => [
            sorm.equal(item.id, new QueryUnit(Number, new Queryable(undefined, TestTable).top(1)))
          ])
          .getSelectDef();
      }).to.throw(/하나/);
    });

    it("WHERE 안에 서브쿼리를 넣을 수 있다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .where(item => [
            sorm.equal(item.id, new QueryUnit(Number, new Queryable(undefined, TestTable).top(1).select(item1 => ({id: item1.id}))))
          ])
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        where: [
          [
            [
              ["[TBL].[id]", " IS ", "NULL"],
              " AND ",
              [
                {
                  from: "[TestDb].[TestSchema].[TestTable]",
                  as: "[TBL]",
                  select: {
                    "[id]": "[TBL].[id]"
                  },
                  top: 1
                },
                " IS ",
                "NULL"
              ]
            ],
            " OR ",
            [
              "[TBL].[id]",
              " = ",
              {
                from: "[TestDb].[TestSchema].[TestTable]",
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]"
                },
                top: 1
              }
            ]
          ]
        ]
      });
    });

    it("DISTINCT", () => {
      expect(
        new Queryable(undefined, TestTable)
          .distinct()
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        distinct: true
      });
    });

    it("TOP", () => {
      expect(
        new Queryable(undefined, TestTable)
          .top(10)
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        top: 10
      });
    });

    it("ORDER BY", () => {
      expect(
        new Queryable(undefined, TestTable)
          .orderBy(item => item.id)
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        orderBy: [
          ["[TBL].[id]", "ASC"]
        ]
      });
    });

    it("LIMIT 작업은 반드시 ORDER BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .limit(1, 2)
          .getSelectDef();
      }).to.throw(/ORDER BY/);
    });

    it("LIMIT", () => {
      expect(
        new Queryable(undefined, TestTable)
          .orderBy(item => item.id)
          .limit(1, 2)
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        limit: [1, 2],
        orderBy: [
          ["[TBL].[id]", "ASC"]
        ]
      });
    });

    it("GROUP BY", () => {
      expect(
        new Queryable(undefined, TestTable)
          .groupBy(item => [
            item.id,
            item.name
          ])
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        groupBy: [
          "[TBL].[id]",
          "[TBL].[name]"
        ]
      });
    });

    it("HAVING 작업은 반드시 GROUP BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .having(item => [
            sorm.equal(item.id, 1)
          ])
          .getSelectDef();
      }).to.throw(/GROUP BY/);
    });

    it("HAVING", () => {
      expect(
        new Queryable(undefined, TestTable)
          .groupBy(item => [
            item.id,
            item.name
          ])
          .having(item => [
            sorm.equal(item.id, 1)
          ])
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]"
        },
        groupBy: [
          "[TBL].[id]",
          "[TBL].[name]"
        ],
        having: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("JOIN", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, item) => qr)
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[test.id]": "[TBL.test].[id]",
          "[test.name]": "[TBL.test].[name]"
        },
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]"
            },
            isSingle: false
          }
        ]
      });
    });

    it("JOIN 된 테이블에 대해 SELECT 를 재구성 할 수 있다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(TestTable, "tests", (qr, item) => qr)
          .select(item => ({
            id: item.id,
            tt: item.tests.map(item1 => ({
              id1: item1.id
            }))
          }))
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[tt.id1]": "[TBL.tests].[id]"
        },
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.tests]",
            select: {
              "[id]": "[TBL.tests].[id]",
              "[name]": "[TBL.tests].[name]"
            },
            isSingle: false
          }
        ]
      });
    });

    it("JOIN 시, UNION ALL 사용이 가능하다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(
            [
              new Queryable(undefined, TestTable), new Queryable(undefined, TestTable), new Queryable(undefined, TestTable)
            ],
            "test",
            (qr, item) => qr
          )
          .getSelectDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[test.id]": "[TBL.test].[id]",
          "[test.name]": "[TBL.test].[name]"
        },
        join: [
          {
            from: [
              {
                from: "[TestDb].[TestSchema].[TestTable]",
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]"
                }
              },
              {
                from: "[TestDb].[TestSchema].[TestTable]",
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]"
                }
              },
              {
                from: "[TestDb].[TestSchema].[TestTable]",
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]"
                }
              }
            ],
            as: "[TBL.test]",
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]"
            },
            isSingle: false
          }
        ]
      });
    });

    it("JOIN 후 WRAPPING 시 SELECT 가 재구성 된다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, item) => qr)
          .wrap()
          .getSelectDef()
      ).to.deep.equal({
        from: {
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[test.id]": "[TBL.test].[id]",
            "[test.name]": "[TBL.test].[name]"
          },
          join: [
            {
              from: "[TestDb].[TestSchema].[TestTable]",
              as: "[TBL.test]",
              select: {
                "[id]": "[TBL.test].[id]",
                "[name]": "[TBL.test].[name]"
              },
              isSingle: false
            }
          ]
        },
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[test.id]": "[TBL].[test.id]",
          "[test.name]": "[TBL].[test.name]"
        }
      });
    });

    it("복수 아이템을 위한 JOIN 을 하고나면, LIMIT 이 불가능하다", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, item) => qr)
          .orderBy(item => item.id)
          .limit(1, 2)
          .getSelectDef();
      }).to.throw(/다수/);
    });

    it("단일 아이템을 위한 JOIN 을 하고나선, LIMIT 이 가능하다", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, item) => qr, true)
          .orderBy(item => item.id)
          .limit(1, 2)
          .getSelectDef();
      }).to.not.throw();
    });
  });

  describe("INSERT", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .wrap()
          .getInsertDef({
            name: "홍길동"
          });
      }).to.throw(/TABLE/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .select(item => ({
            id: item.id,
            name: item.name
          }))
          .getInsertDef({
            name: "홍길동"
          });
      }).to.throw(/SELECT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .where(item => [sorm.equal(item.id, 1)])
          .getInsertDef({name: "홍길동"});
      }).to.throw(/WHERE/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .distinct()
          .getInsertDef({name: "홍길동"});
      }).to.throw(/DISTINCT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .top(10)
          .getInsertDef({name: "홍길동"});
      }).to.throw(/TOP/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .orderBy(item => item.id)
          .getInsertDef({name: "홍길동"});
      }).to.throw(/ORDER BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .limit(1, 10)
          .getInsertDef({name: "홍길동"});
      }).to.throw(/LIMIT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .groupBy(item => [item.id])
          .getInsertDef({name: "홍길동"});
      }).to.throw(/GROUP BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .having(item => [sorm.equal(item.id, 1)])
          .getInsertDef({name: "홍길동"});
      }).to.throw(/HAVING/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .join(TestTable, "tests", (qr, en) => qr)
          .getInsertDef({name: "홍길동"} as any);
      }).to.throw(/JOIN/);
    });

    it("기본적으로 테이블에 데이터를 입력한다.", () => {
      expect(
        new Queryable(undefined, TestTable).getInsertDef({
          name: "홍길동"
        })
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["INSERTED.*"],
        record: {
          "[name]": "N'홍길동'"
        }
      });
    });
  });

  describe("UPDATE", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .wrap()
          .getUpdateDef({
            id: 1,
            name: "홍길동"
          });
      }).to.throw(/TABLE/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .select(item => ({
            id: item.id,
            name: item.name
          }))
          .getUpdateDef({
            id: 1,
            name: "홍길동"
          });
      }).to.throw(/SELECT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .orderBy(item => item.id)
          .getUpdateDef({id: 1, name: "홍길동"});
      }).to.throw(/ORDER BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .limit(1, 10)
          .getUpdateDef({id: 1, name: "홍길동"});
      }).to.throw(/LIMIT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .groupBy(item => [item.id])
          .getUpdateDef({id: 1, name: "홍길동"});
      }).to.throw(/GROUP BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .having(item => [sorm.equal(item.id, 1)])
          .getUpdateDef({id: 1, name: "홍길동"});
      }).to.throw(/HAVING/);
    });

    it("기본적으로 테이블 데이터를 수정한다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .getUpdateDef(item => ({
            id: 1,
            name: item.name
          }))
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["INSERTED.*"],
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("TOP", () => {
      expect(
        new Queryable(undefined, TestTable)
          .top(1)
          .getUpdateDef(item => ({
            id: 1,
            name: item.name
          }))
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["INSERTED.*"],
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        },
        top: 1
      });
    });

    it("WHERE", () => {
      expect(
        new Queryable(undefined, TestTable)
          .where(item => [sorm.equal(item.id, 1)])
          .getUpdateDef(item => ({
            id: 1,
            name: item.name
          }))
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["INSERTED.*"],
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        },
        where: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, en) => qr)
          .where(item => [sorm.equal(item.id, item.test[0].id)])
          .getUpdateDef(item => ({
            id: 1,
            name: item.test[0].name
          }))
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["INSERTED.*"],
        as: "[TBL]",
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]"
            },
            isSingle: false
          }
        ],
        record: {
          "[id]": 1,
          "[name]": "[TBL.test].[name]"
        },
        where: [
          [
            [
              ["[TBL].[id]", " IS ", "NULL"],
              " AND ",
              ["[TBL.test].[id]", " IS ", "NULL"]
            ],
            " OR ",
            [
              "[TBL].[id]",
              " = ",
              "[TBL.test].[id]"
            ]
          ]
        ]
      });
    });
  });

  describe("UPSERT", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .wrap()
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/TABLE/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .select(item => ({
            id: item.id,
            name: item.name
          }))
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/SELECT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .distinct()
          .getInsertDef({name: "홍길동"});
      }).to.throw(/DISTINCT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .top(10)
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/TOP/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .orderBy(item => item.id)
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/ORDER BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .limit(1, 10)
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/LIMIT/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .groupBy(item => [item.id])
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/GROUP BY/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .having(item => [sorm.equal(item.id, 1)])
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/HAVING/);

      expect(() => {
        new Queryable(undefined, TestTable)
          .join(TestTable, "tests", (qr, en) => qr)
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/JOIN/);
    });

    it("WHERE 문을 반드시 지정해야 한다.", () => {
      expect(() => {
        new Queryable(undefined, TestTable)
          .getUpsertDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          });
      }).to.throw(/WHERE/);
    });

    it("기본적으로 테이블 데이터를 수정하며, WHERE 문에 부합하는 데이터가 없으면 INSERT 한다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .where(item => [sorm.equal(item.id, 1)])
          .getUpsertDef(item => ({
            name: item.name
          }), {
            name: "홍길동2"
          })
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: `[TBL]`,
        where: [
          ["[TBL].[id]", " = ", 1]
        ],
        updateRecord: {
          "[name]": "[TBL].[name]"
        },
        insertRecord: {
          "[name]": "N'홍길동2'"
        },
        output: ["INSERTED.*"]
      });
    });
  });

  describe("DELETE", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
        expect(() => {
          new Queryable(undefined, TestTable)
            .wrap()
            .getDeleteDef();
        }).to.throw(/TABLE/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .select(item => ({
              id: item.id,
              name: item.name
            }))
            .getDeleteDef();
        }).to.throw(/SELECT/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .distinct()
            .getDeleteDef();
        }).to.throw(/DISTINCT/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .orderBy(item => item.id)
            .getDeleteDef();
        }).to.throw(/ORDER BY/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .limit(1, 10)
            .getDeleteDef();
        }).to.throw(/LIMIT/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .groupBy(item => [item.id])
            .getDeleteDef();
        }).to.throw(/GROUP BY/);

        expect(() => {
          new Queryable(undefined, TestTable)
            .having(item => [sorm.equal(item.id, 1)])
            .getDeleteDef();
        }).to.throw(/HAVING/);
      });
    });

    it("기본적으로 테이블 데이터를 삭제한다.", () => {
      expect(
        new Queryable(undefined, TestTable)
          .getDeleteDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["DELETED.*"],
        as: "[TBL]"
      });
    });

    it("WHERE", () => {
      expect(
        new Queryable(undefined, TestTable)
          .where(item => [sorm.equal(item.id, 1)])
          .getDeleteDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["DELETED.*"],
        as: "[TBL]",
        where: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("TOP", () => {
      expect(
        new Queryable(undefined, TestTable)
          .top(10)
          .getDeleteDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["DELETED.*"],
        as: "[TBL]",
        top: 10
      });
    });

    it("JOIN + WHERE", () => {
      expect(
        new Queryable(undefined, TestTable)
          .join(TestTable, "test", (qr, en) => qr)
          .where(item => [sorm.equal(item.id, item.test[0].id)])
          .getDeleteDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["DELETED.*"],
        as: "[TBL]",
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]"
            },
            isSingle: false
          }
        ],
        where: [
          [
            [
              ["[TBL].[id]", " IS ", "NULL"],
              " AND ",
              ["[TBL.test].[id]", " IS ", "NULL"]
            ],
            " OR ",
            ["[TBL].[id]", " = ", "[TBL.test].[id]"]
          ]
        ]
      });
    });
  });
});
