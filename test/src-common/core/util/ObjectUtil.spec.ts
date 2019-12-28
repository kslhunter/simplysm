import {DateOnly, DateTime, ObjectUtil, Time, Uuid} from "@simplysm/sd-core-common";
import {expect} from "chai";

describe("core.util.ObjectUtil", () => {
  describe("clone", () => {
    it("객체를 복사한 다른 객체를 반환한다.", () => {
      const obj = {a: 1, b: "2"};
      const cloneObj = ObjectUtil.clone(obj);

      expect(obj).to.not.equal(cloneObj);
      expect(obj).to.deep.equal(cloneObj);
    });

    it("excludes 옵션이 있는 Property 를 무시하고 복사한다.", () => {
      const obj = {a: 1, b: "2"};
      const cloneObj = ObjectUtil.clone(obj, {excludes: ["b"]});

      expect(cloneObj).to.not.have.key("b");
    });

    it("순환 객체일 경우에도 clone 이 가능하다.", () => {
      const obj = {a: 1, b: "2", c: {d: "a", e: undefined as any}};
      obj.c.e = obj.c;
      const cloneObj = ObjectUtil.clone(obj);

      expect(obj).to.not.equal(cloneObj);
      expect(obj).to.deep.equal(cloneObj);
    });

    it("Date, DateTime, DateOnly, Time, Uuid 가 있어도 정상 동작한다.", () => {
      const obj = {
        date: new Date(),
        dt: new DateTime(),
        d: new DateOnly(),
        t: new Time(),
        uuid: Uuid.new()
      };
      const cloneObj = ObjectUtil.clone(obj);

      expect(obj).to.not.equal(cloneObj);
      expect(obj).to.deep.equal(cloneObj);
    });

    it("(array) 정상 작동 한다.", () => {
      const arr = [
        {a: 1, b: "2"},
        {a: 3, b: "4"}
      ];
      const cloneObj = ObjectUtil.clone(arr);

      expect(arr).to.not.equal(cloneObj);
      expect(arr).to.deep.equal(cloneObj);
    });

    it("(array) excludes 를 사용해도 정상 작동 한다.", () => {
      const arr = [
        {a: 1, b: "2"},
        {a: 3, b: "4"}
      ];
      const cloneObj = ObjectUtil.clone(arr, {excludes: ["b"]});

      expect(cloneObj[0]).to.not.have.key("b");
      expect(cloneObj[1]).to.not.have.key("b");
    });
  });

  describe("equal", () => {
    it("두 객체의 동일 여부를 확인한다.", () => {
      const obj1 = {a: 1, b: "2"};
      const obj2 = {a: 1, b: "2"};
      const obj3 = {a: 1, b: "3"};

      expect(ObjectUtil.equal(obj1, obj2)).to.equal(true);
      expect(ObjectUtil.equal(obj1, obj3)).to.equal(false);
    });

    it("string, number 등의 기본 타입이 입력되도 정상 작동한다.", () => {
      expect(ObjectUtil.equal(1, 1)).to.equal(true);
      expect(ObjectUtil.equal("1", "1")).to.equal(true);
      expect(ObjectUtil.equal(1, "1")).to.equal(false);
    });

    it("excludes 옵션이 설정된 경우, 해당 Property 가 서로 다르더라도, 다른 Property 가 그대로라면 동일한 값으로 인식한다.", () => {
      const obj1 = {a: 1, b: "2"};
      const obj2 = {a: 1, b: "3"};

      expect(ObjectUtil.equal(obj1, obj2, {excludes: ["b"]})).to.equal(true);
    });

    it("keys 옵션이 설정된 경우, 해당 Property 만 비교하여, 다른 Property 가 서로 다르더라도, 동일한 값으로 인식한다.", () => {
      const obj1 = {a: 1, b: "2"};
      const obj2 = {a: 1, b: "3"};

      expect(ObjectUtil.equal(obj1, obj2, {keys: ["a"]})).to.equal(true);
    });

    it("순환 Object 의 경우, 순환오류가 발생된다.", () => {
      const obj1 = {a: 1, b: "2", c: {d: "a", e: undefined as any}};
      obj1.c.e = obj1.c;

      const obj2 = {a: 1, b: "2", c: {d: "a", e: undefined as any}};
      obj2.c.e = obj2.c;

      if (process.versions.node || /Chrome/.test(navigator.userAgent)) {
        expect(() => ObjectUtil.equal(obj1, obj2)).to.be.throw(RangeError);
      }
      else {
        expect(() => ObjectUtil.equal(obj1, obj2)).to.be.throw(/스택 공간 부족/);
      }
    });

    it("순환 Object 이지만, 포인터가 같은곳을 바라보고 있는것이 있다면, 같은 값으로 간주되고, 비교 순환이 멈추기 때문에 정상 동작한다.", () => {
      const obj1 = {a: 1, b: "2", c: {d: "a", e: undefined as any}};
      obj1.c.e = obj1.c;

      const obj2 = {a: 1, b: "2", c: {d: "a", f: obj1}};
      const obj3 = {a: 1, b: "2", c: {d: "a", f: obj1}};

      expect(ObjectUtil.equal(obj2, obj3)).to.equal(true);
    });

    it("Date, DateTime, DateOnly, Time, Uuid 가 있어도 정상 동작한다.", () => {
      const obj1 = {
        date: new Date(),
        dt: new DateTime(),
        d: new DateOnly(),
        t: new Time(),
        uuid: Uuid.new()
      };
      const obj2 = ObjectUtil.clone(obj1);

      expect(ObjectUtil.equal(obj1, obj2)).to.equal(true);
    });

    it("(array) 정상 작동 한다(배열내 객체의 순서가 다르면, 내용물이 같더라도 다른것으로 인식된다)", () => {
      const arr1 = [{a: 1, b: "1", c: [1, 2]}, {a: 1, b: "2", c: [1, 2]}];
      const arr2 = [{a: 1, b: "1", c: [1, 2]}, {a: 1, b: "2", c: [1, 2]}];
      const arr3 = [{a: 1, b: "2", c: [1, 2]}, {a: 1, b: "1", c: [1, 2]}];
      const arr4 = [{a: 1, b: "1", c: [1, 2]}];
      const arr5 = [{a: 1, b: "2", c: [1, 2]}];

      expect(ObjectUtil.equal(arr1, arr2)).to.equal(true);
      expect(ObjectUtil.equal(arr1, arr3)).to.equal(false);
      expect(ObjectUtil.equal(arr1, arr4)).to.equal(false);
      expect(ObjectUtil.equal(arr1, arr5)).to.equal(false);
    });

    it("(array) 내부의 모든 Array 에서 순서가 다르더라도, 내용물이 같다면 같은것으로 인식되도록 옵션으로 설정할 수 있다", () => {
      const arr1 = [{a: 1, b: "1", c: [1, 2]}, {a: 1, b: "2", c: [1, 2]}];
      const arr2 = [{a: 1, b: "1", c: [2, 1]}, {a: 1, b: "2", c: [1, 2]}];
      const arr3 = [{a: 1, b: "2", c: [1, 2]}, {a: 1, b: "1", c: [1, 2]}];
      const arr4 = [{a: 1, b: "1", c: [1, 2]}];
      const arr5 = [{a: 1, b: "2", c: [1, 2]}];

      expect(ObjectUtil.equal(arr1, arr2, {ignoreArrayIndex: true})).to.equal(true);
      expect(ObjectUtil.equal(arr1, arr3, {ignoreArrayIndex: true})).to.equal(true);
      expect(ObjectUtil.equal(arr1, arr4, {ignoreArrayIndex: true})).to.equal(false);
      expect(ObjectUtil.equal(arr1, arr5, {ignoreArrayIndex: true})).to.equal(false);
    });

    it("(array) Array 에서 excludes 옵션이 정상 동작한다.", () => {
      const arr1 = [{a: 1, b: "1", c: [1, 2]}, {a: 1, b: "2", c: [1, 2]}];
      const arr2 = [{a: 1, b: "1", c: [1, 2]}, {a: 1, b: "3", c: [1, 2]}];

      expect(ObjectUtil.equal(arr1, arr2, {excludes: ["b"]})).to.equal(true);
    });
  });

  describe("merge", () => {
    it("두개의 객체를 merge 합니다", () => {
      const obj1 = {a: 1, b: 1, c: 3};
      const obj2 = {a: 1, b: 2, d: 4};
      expect(ObjectUtil.merge(obj1, obj2)).to.deep.equal({a: 1, b: 2, c: 3, d: 4});
    });

    it("Hierarchical 구조일 경우, 내부 객체 도 merge 로 동작합니다", () => {
      const obj1 = {a: 1, b: 1, c: 3, e: {f: 1, g: 1, h: 2}};
      const obj2 = {a: 1, b: 2, d: 4, e: {f: 1, g: 1, i: 3}};
      expect(ObjectUtil.merge(obj1, obj2)).to.deep.equal({a: 1, b: 2, c: 3, d: 4, e: {f: 1, g: 1, h: 2, i: 3}});
    });

    it("Date, DateTime, DateOnly, Time 에서도 정상 동작합니다", () => {
      const obj1 = {
        a: 1,
        dt: new DateTime(),
        d: new DateOnly(),
        t: new Time()
      };
      const obj2 = {
        date: new Date(),
        dt: new DateTime().addDays(1),
        d: new DateOnly().addDays(1),
        t: new Time().addHours(1),
        uuid: Uuid.new()
      };
      expect(ObjectUtil.merge(obj1, obj2)).to.deep.equal(
        {a: 1, ...obj2}
      );
    });
  });

  describe("validate", () => {
    it("값의 유효성을 확인하여, 그 결과를 반환한다", () => {
      expect(
        ObjectUtil.validate(1, {
          type: Number,
          includes: [1, 2],
          notnull: false,
          validator: (item) => item !== 3
        })
      ).to.equal(undefined);

      const validator = (item: any) => item !== undefined;
      expect(
        ObjectUtil.validate(undefined as any, {
          type: String,
          includes: ["1", "2"],
          notnull: true,
          validator
        })
      ).to.deep.equal({
        value: undefined,
        invalidateDef: {
          type: [String],
          includes: ["1", "2"],
          notnull: true,
          validator
        }
      });
    });

    it("notnull 이 아닌경우, 입력된 값이 undefined 라면, 다른 조건과 관계없이 유효한 것으로 본다.", () => {
      const validator = (item: any) => item !== undefined;
      expect(
        ObjectUtil.validate(undefined as any, {
          type: String,
          includes: ["1", "2"],
          notnull: false,
          validator
        })
      ).to.deep.equal(undefined);
    });
  });

  describe("validateObject", () => {
    it("Object 의 각 키별 유효성을 확인한다. 오류가 아닌 반환값을 사용한다.", () => {
      const obj = {
        a: 1 as number,
        b: undefined as any
      };

      const validator = (item: any) => item !== undefined;

      expect(
        ObjectUtil.validateObject(obj, {
          a: {
            type: Number,
            includes: [1, 2],
            notnull: false,
            validator: (item) => item !== 3
          },
          b: {
            type: String,
            includes: ["1", "2"],
            notnull: true,
            validator
          }
        })
      ).to.deep.equal({
        b: {
          value: undefined,
          invalidateDef: {
            type: [String],
            includes: ["1", "2"],
            notnull: true,
            validator
          }
        }
      });
    });
  });

  describe("validateArray", () => {
    it("Array<Object> 의 내용물(Object)에 대해, Object 의 각 키별 유효성을 확인한다. 오류가 아닌 반환값을 사용한다.", () => {
      const arr = [
        {
          a: 1 as number,
          b: undefined as any
        },
        {
          a: 1 as number,
          b: "1"
        }
      ];

      const validator = (item: any) => item !== undefined;

      expect(
        ObjectUtil.validateArray(arr, () => ({
          a: {
            type: Number,
            includes: [1, 2],
            notnull: false,
            validator: (item1) => item1 !== 3
          },
          b: {
            type: String,
            includes: ["1", "2"],
            notnull: true,
            validator
          }
        }))
      ).to.deep.equal([
        {
          index: 0,
          item: arr[0],
          result: {
            b: {
              value: undefined,
              invalidateDef: {
                type: [String],
                includes: ["1", "2"],
                notnull: true,
                validator
              }
            }
          }
        }
      ]);
    });
  });

  describe("getChainValueByDepth", () => {
    it("key 와 depth 를 이용하여 Hierarchical 구조의 Object 에서 데이터 추출, child 와 같은 특정키로, 특정 깊이까지 내려가는 데이터에 대한 값을 추출한다.", () => {
      const obj = {
        a: 1,
        b: {
          a: 2,
          b: {
            a: 3,
            b: {
              a: 4
            }
          }
        }
      };

      expect(
        ObjectUtil.getChainValueByDepth(obj, "b", 3)
      ).to.deep.equal({
        a: 4
      });
    });

    it("중간 과정에 undefined 가 등장하는경우, 오류가 발생된다", () => {
      expect(() => {
        ObjectUtil.getChainValueByDepth({a: 1}, "a", 3);
      }).to.throw();
    });

    it("중간 과정에 undefined 가 등장하는 경우, 오류를 발생하지 않고 undefined 를 반환하도록 설정할 수 있다.", () => {
      expect(ObjectUtil.getChainValueByDepth({a: 1}, "a", 3, true)).to.equal(undefined);
    });
  });

  describe("getChainValue", () => {
    it("chainKey(aaa.bbb.ccc) 를 이용하여 Hierarchical 구조의 Object 에서 데이터 추출, 키 체인을 문자열로 제공받아 Object 에서 내부의 데이터를 가져오려 할때 사용할 수 있다.", () => {
      const obj = {
        a: {
          b: {
            c: 1
          }
        }
      };
      expect(ObjectUtil.getChainValue(obj, "a.b.c")).to.equal(1);
    });

    it("중간 과정에 undefined 가 등장하는경우, 오류가 발생된다", () => {
      expect(() => {
        ObjectUtil.getChainValue({a: 1}, "a.b.c");
      }).to.throw();
    });

    it("중간 과정에 undefined 가 등장하는 경우, 오류를 발생하지 않고 undefined 를 반환하도록 설정할 수 있다.", () => {
      expect(ObjectUtil.getChainValue({a: 1}, "a.b.c", true)).to.equal(undefined);
    });
  });

  describe("setChainValue", () => {
    it("chainKey(aaa.bbb.ccc) 를 이용하여 Hierarchical 구조의 Object 에 데이터를 입력", () => {
      const obj = {
        a: {
          b: {
            c: 1
          }
        }
      };
      ObjectUtil.setChainValue(obj, "a.b.c", 2);
      expect(obj.a.b.c).to.equal(2);
    });
  });

  describe("deleteChainValue", () => {
    it("chainKey(aaa.bbb.ccc) 를 이용하여 Hierarchical 구조의 Object 에 데이터를 입력", () => {
      const obj = {
        a: {
          b: {
            c: 1
          }
        }
      };
      ObjectUtil.deleteChainValue(obj, "a.b.c");
      expect(Object.keys(obj.a.b)).to.not.includes("c");
    });
  });

  describe("clearUndefined", () => {
    it("Object 의 각 키를 돌면서, 키의 값이 undefined 면, 해당 키 자체를 delete 한다.", () => {
      const obj = {a: 1, b: undefined};
      ObjectUtil.clearUndefined(obj);
      expect(obj).to.not.have.key("b");
    });
  });
});