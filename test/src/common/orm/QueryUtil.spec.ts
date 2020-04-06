import {expect} from "chai";
import {QueryUnit, QueryUtils} from "@simplysm/sd-orm-common";
import {DateOnly, DateTime, Time, Uuid} from "@simplysm/sd-core-common";

describe("(common) orm.QueryUtils", () => {
  describe("getTableNameChain", () => {
    it("테이블 정의로 부터 테이블명 체인(db, schema, table)을 가져올 수 있다.", () => {
      const result = QueryUtils.getTableNameChain({
        database: "TEST_DB",
        schema: "TEST_SCHEMA",
        name: "TEST_TABLE"
      });
      expect(result).to.deep.equal(["TEST_DB", "TEST_SCHEMA", "TEST_TABLE"]);

      const result1 = QueryUtils.getTableNameChain({
        schema: "TEST_SCHEMA",
        name: "TEST_TABLE"
      });
      expect(result1).to.deep.equal(["TEST_SCHEMA", "TEST_TABLE"]);

      const result2 = QueryUtils.getTableNameChain({
        name: "TEST_TABLE"
      });
      expect(result2).to.deep.equal(["TEST_TABLE"]);

      const result3 = QueryUtils.getTableNameChain({
        database: "TEST_DB",
        name: "TEST_TABLE"
      });
      expect(result3).to.deep.equal(["TEST_DB", "dbo", "TEST_TABLE"]);
    });
  });

  describe("getTableName", () => {
    it("테이블 정의로 부터 테이블명을 가져올 수 있다.", () => {
      const result = QueryUtils.getTableName({
        database: "TEST_DB",
        schema: "TEST_SCHEMA",
        name: "TEST_TABLE"
      });
      expect(result).to.equal("[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]");

      const result1 = QueryUtils.getTableName({
        schema: "TEST_SCHEMA",
        name: "TEST_TABLE"
      });
      expect(result1).to.equal("[TEST_SCHEMA].[TEST_TABLE]");

      const result2 = QueryUtils.getTableName({
        name: "TEST_TABLE"
      });
      expect(result2).to.equal("[TEST_TABLE]");

      const result3 = QueryUtils.getTableName({
        database: "TEST_DB",
        name: "TEST_TABLE"
      });
      expect(result3).to.equal("[TEST_DB].[dbo].[TEST_TABLE]");
    });
  });

  describe("getQueryValue", () => {
    it("QueryUnit, string, number 등의 타입 객체로 부터 QueryDef 에 입력 가능한 QueryValue 나 그 배열인 QueryValueFormula 로 데이터 전환함. " +
      "문자열은 \"'aaa'\"로 변환되야함", () => {
      expect(QueryUtils.getQueryValue("1234")).to.equal("N'1234'");
      expect(QueryUtils.getQueryValue(1234)).to.equal(1234);
      expect(QueryUtils.getQueryValue(new QueryUnit(String, "1234"))).to.equal("1234");
      expect(QueryUtils.getQueryValue(new QueryUnit(String, ["1234", 5678]))).to.deep.equal(["1234", 5678]);
    });
  });

  describe("canGetQueryValue", () => {
    it("QueryValue 이거나, QueryValue 로 전환할 수 있는 타입인지 확인할 수 있다.", () => {
      expect(QueryUtils.canGetQueryValue(undefined)).to.equal(true);
      expect(QueryUtils.canGetQueryValue("1234")).to.equal(true);
      expect(QueryUtils.canGetQueryValue(1234)).to.equal(true);
      expect(QueryUtils.canGetQueryValue(new QueryUnit(String, "1234"))).to.equal(true);
      expect(QueryUtils.canGetQueryValue(new QueryUnit(String, ["1234", 5678]))).to.equal(true);
      expect(QueryUtils.canGetQueryValue(new Date())).to.equal(false);
    });
  });

  describe("getQueryValueType", () => {
    it("QueryValue 로 전환하면, 어떤 타입으로 반환될 객체인지, 확인할 수 있다.", () => {
      expect(QueryUtils.getQueryValueType(1234)).to.equal(Number);
      expect(QueryUtils.getQueryValueType("1234")).to.equal(String);
      expect(QueryUtils.getQueryValueType(true)).to.equal(Boolean);
      expect(QueryUtils.getQueryValueType(new DateOnly())).to.equal(DateOnly);
      expect(QueryUtils.getQueryValueType(new DateTime())).to.equal(DateTime);
      expect(QueryUtils.getQueryValueType(new Time())).to.equal(Time);
      expect(QueryUtils.getQueryValueType(Uuid.new())).to.equal(Uuid);
      expect(QueryUtils.getQueryValueType(Buffer.alloc(1))).to.equal(Buffer);
      expect(QueryUtils.getQueryValueType(new QueryUnit(String, "1234"))).to.equal(String);
      expect(QueryUtils.getQueryValueType(new QueryUnit(String, ["1234", 5678]))).to.equal(String);
    });
  });

  describe("getDataType", () => {
    it("특정 타입을 DB 에서 사용되는 타입 문자열로 변환할 수 있다.", () => {
      expect(QueryUtils.getDataType(String)).to.equal("NVARCHAR(255)");
      expect(QueryUtils.getDataType(Number)).to.equal("BIGINT");
      expect(QueryUtils.getDataType(Boolean)).to.equal("BIT");
      expect(QueryUtils.getDataType(DateTime)).to.equal("DATETIME2");
      expect(QueryUtils.getDataType(DateOnly)).to.equal("DATE");
      expect(QueryUtils.getDataType(Time)).to.equal("TIME");
      expect(QueryUtils.getDataType(Uuid)).to.equal("UNIQUEIDENTIFIER");
      expect(QueryUtils.getDataType(Buffer)).to.equal("VARBINARY(MAX)");
    });
  });

  describe("parseQueryResult", () => {
    it("DB 에서 반환한 배열의 DATETIME, DATE 등의 타입의 문자열이 DateTime, DateOnly 등의 타입으로 변환된다.", () => {
      const uuid = Uuid.new();
      expect(
        QueryUtils.parseQueryResult([
          {
            dt: "2019-01-01 01:01:01.001",
            d: "2019-01-01",
            t: "01:01:01.001",
            u: uuid.toString(),
            b: 0,
            n: 3
          }
        ], {
          columns: {
            dt: {dataType: "DateTime"},
            d: {dataType: "DateOnly"},
            t: {dataType: "Time"},
            u: {dataType: "Uuid"},
            b: {dataType: "Boolean"},
            n: {dataType: "Number"}
          }
        })
      ).to.deep.equal([
        {
          dt: DateTime.parse("2019-01-01 01:01:01.001"),
          d: DateOnly.parse("2019-01-01"),
          t: Time.parse("01:01:01.001"),
          u: uuid,
          b: false,
          n: 3
        }
      ]);
    });

    it("DB 에서 반환한 1계층 배열을 조인 정의에 따라 다계층의 배열로 변환한다.", () => {
      expect(
        QueryUtils.parseQueryResult([
          {
            "a": "0",
            "j.a": "1",
            "j.b": "2",
            "j.c": "3",
            "j.d.a": "4",
            "j.d.b": "5",
            "j.d.c": "6"
          },
          {
            "a": "0",
            "j.a": "1",
            "j.b": "2",
            "j.c": "3",
            "j.d.a": "7",
            "j.d.b": "8",
            "j.d.c": "9"
          }
        ], {
          joins: {
            "j": {isSingle: true},
            "j.d": {isSingle: false}
          }
        })
      ).to.deep.equal([
        {
          "a": "0",
          "j": {
            "a": "1",
            "b": "2",
            "c": "3",
            "d": [
              {
                "a": "4",
                "b": "5",
                "c": "6"
              },
              {
                "a": "7",
                "b": "8",
                "c": "9"
              }
            ]
          }
        }
      ]);
    });

    it("내용물이 전부 NULL(undefined) 인 데이터는 무시된다.", () => {
      expect(
        QueryUtils.parseQueryResult([
          {
            "a": "0",
            "j.a": undefined,
            "j.b": undefined,
            "j.c": undefined
          }
        ], {
          joins: {
            "j": {isSingle: true}
          }
        })
      ).to.deep.equal([
        {
          "a": "0"
        }
      ]);
    });

    it("내용물이 전부 NULL(undefined) 인 배열이 무시되지 않고 빈 배열로 나타난다. (1차 JOIN 한 배열만)", () => {
      expect(
        QueryUtils.parseQueryResult([
          {
            "a": "0",
            "j.a": undefined,
            "j.b": undefined,
            "j.c": undefined
          },
          {
            "a": "0",
            "j.a": undefined,
            "j.b": undefined,
            "j.c": undefined
          }
        ], {
          joins: {
            "j": {isSingle: false}
          }
        })
      ).to.deep.equal([
        {
          "a": "0",
          "j": []
        }
      ]);
    });

    it("여러계층 안의 데이터가 undefined 여도 문제없이 작동한다.", () => {
      expect(
        QueryUtils.parseQueryResult([
          {
            "a": "0",
            "j.a": "1",
            "j.b": "2",
            "j.c": "3",
            "j.d.a": undefined,
            "j.d.b": undefined,
            "j.d.c": undefined,
            "j.d.d.a": "1",
            "j.d.d.b": "2",
            "j.d.d.c": "3"
          },
          {
            "a": "0",
            "j.a": "1",
            "j.b": "2",
            "j.c": "3",
            "j.d.a": undefined,
            "j.d.b": undefined,
            "j.d.c": undefined,
            "j.d.d.a": "1",
            "j.d.d.b": "2",
            "j.d.d.c": "4"
          },
          {
            "a": "1",
            "j.a": "1",
            "j.b": "2",
            "j.c": "4",
            "j.d.a": undefined,
            "j.d.b": undefined,
            "j.d.c": undefined,
            "j.d.d.a": undefined,
            "j.d.d.b": undefined,
            "j.d.d.c": undefined
          }
        ], {
          joins: {
            "j": {isSingle: true},
            "j.d": {isSingle: false},
            "j.d.d": {isSingle: true}
          }
        })
      ).to.deep.equal([
        {
          "a": "0",
          "j": {
            "a": "1",
            "b": "2",
            "c": "3",
            "d": [
              {
                "d": {
                  "a": "1",
                  "b": "2",
                  "c": "3"
                }
              },
              {
                "d": {
                  "a": "1",
                  "b": "2",
                  "c": "4"
                }
              }
            ]
          }
        },
        {
          "a": "1",
          "j": {
            "a": "1",
            "b": "2",
            "c": "4",
            "d": []
          }
        }
      ]);
    });

    it("[FIX] 데이터가 너무 많으면 속도가 느려지는 현상 수정", () => {
      const data = [];
      for (let i = 0; i < 10000; i++) {
        data.push({
          "a": "0",
          "j.a": i,
          "j.b": i,
          "j.c": i,
          "j.d": i,
          "j.aa.a": i,
          "j.aa.b": i,
          "j.aa.c": i,
          "j.aa.d": i
        });
      }

      const prevTick = new DateTime().tick;
      QueryUtils.parseQueryResult(data, {
        joins: {
          "j": {isSingle: false},
          "j.aa": {isSingle: false}
        }
      });

      if (process.versions.node === undefined && (navigator.userAgent.includes("MSIE") || navigator.userAgent.includes("Trident/"))) {
        expect(new DateTime().tick - prevTick).to.lessThan(5000);
      }
      else {
        expect(new DateTime().tick - prevTick).to.lessThan(1000);
      }
    });
  });
});
