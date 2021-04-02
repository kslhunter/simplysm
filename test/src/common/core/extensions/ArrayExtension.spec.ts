import { ArgumentError, DateOnly, DateTime, SdError, Time, TimeoutError, Uuid } from "@simplysm/sd-core-common";
import { expect } from "chai";

describe("(common) core.extensions.ArrayExtensions", () => {
  describe("single", () => {
    it("조건문을 통해, 반환값이 true 인 것만 추출하며, 단일 객체를 반환한다, 해당 추출값이 1개 이상이면 오류가 발생된다", () => {
      expect(["a", "b"].single((item) => item === "a")).to.equal("a");
    });

    it("검색결과가 1개를 초과하면, 오류가 발생된다", () => {
      expect(() => {
        [{ a: 1, b: "2" }, { a: 1, b: "3" }].single((item) => item.a === 1);
      }).to.throw(/복수.*결과/);
    });

    it("검색결과가 없으면, undefined 가 반환될 수 있다", () => {
      expect(["a", "b"].single((item) => item === "c")).to.equal(undefined);
    });

    it("조건문 없이도 사용 가능하다", () => {
      expect(["a"].single()).to.equal("a");
    });
  });

  describe("last", () => {
    it("조건문을 통해, 반환값이 true 인 것중 가장 마지막 단일 객체를 추출한다", () => {
      const arr = [
        { a: 1, b: "2" },
        { a: 2, b: "3" },
        { a: 1, b: "4" },
        { a: 2, b: "5" }
      ];
      expect(arr.last((item) => item.a === 1)).to.deep.equal({ a: 1, b: "4" });
    });

    it("검색결과가 없으면, undefined 가 반환될 수 있다", () => {
      const arr = [
        { a: 1, b: "2" },
        { a: 1, b: "3" },
        { a: 1, b: "4" }
      ];
      expect(arr.last((item) => item.b === "5")).to.deep.equal(undefined);
    });

    it("조건문 없이도 사용 가능하다", () => {
      const arr = [
        { a: 1, b: "2" },
        { a: 1, b: "3" },
        { a: 1, b: "4" }
      ];
      expect(arr.last()).to.deep.equal({ a: 1, b: "4" });
    });
  });

  describe("filterExists", () => {
    it("null 이거나 undefined 인 데이터를 모두 솎아낸다", () => {
      const arr = [
        { a: 1, b: "2" },
        undefined,
        { a: 1, b: "4" },
        undefined
      ];
      expect(arr.filterExists()).to.deep.equal([
        { a: 1, b: "2" },
        { a: 1, b: "4" }
      ]);
    });
  });

  describe("ofType", () => {
    it("특정 타입의 데이터만 추려낸다", () => {
      const arr = [
        Uuid.new(),
        new DateTime(),
        new DateOnly(),
        Uuid.new(),
        new Time(),
        Uuid.new()
      ];
      expect(arr.ofType(Uuid)).to.deep.equal([
        arr[0],
        arr[3],
        arr[5]
      ]);
    });

    it("string, number 등의 일반 타입에서도 정상 동작한다", () => {
      const arr = [
        1,
        "2",
        3,
        "4",
        5,
        "6"
      ];
      expect(arr.ofType(String)).to.deep.equal([
        "2",
        "4",
        "6"
      ]);
    });

    it("특정 타입의 서브 타입이더라도 추려낸다", () => {
      const arr = [
        Uuid.new(),
        new DateTime(),
        new DateOnly(),
        Uuid.new(),
        new Time(),
        Uuid.new(),
        new ArgumentError({}),
        new SdError(),
        new TimeoutError()
      ];
      expect(arr.ofType(SdError)).to.deep.equal([
        arr[6],
        arr[7],
        arr[8]
      ]);
    });
  });

  describe("mapMany", () => {
    it("Array 셀렉터를 통해 반환된 Array 의 목록을 하나의 Array 로 concat 할 수 있다.", () => {
      const arr = [
        { a: 1, b: "2", c: ["a", "b"] },
        { a: 1, b: "3", c: ["c", "d"] },
        { a: 1, b: "4", c: ["e", "f"] }
      ];

      expect(arr.mapMany((item) => item.c)).to.deep.equal(["a", "b", "c", "d", "e", "f"]);
    });

    it("2차원 배열일 경우, 셀렉터 없이 이 작업을 수행할 수도 있다.", () => {
      const arr = [
        [{ v: "a" }, { v: "b" }],
        [{ v: "c" }, { v: "d" }],
        [{ v: "e" }, { v: "f" }]
      ];

      expect(arr.mapMany()).to.deep.equal([
        { v: "a" },
        { v: "b" },
        { v: "c" },
        { v: "d" },
        { v: "e" },
        { v: "f" }
      ]);
    });
  });

  describe("groupBy", () => {
    it("키 셀렉터를 사용하여 {key, values}[] 로 데이터를 그룹핑 할 수 있다.", () => {
      const arr = [
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 },
        { a: 1, b: 2, c: 5, d: 6 },
        { a: 3, b: 4, c: 7, d: 8 }
      ];

      expect(
        arr.groupBy((item) => ({ a: item.a, b: item.b }))
      ).to.deep.equal([
        { dataType: { a: 1, b: 2 }, values: [{ a: 1, b: 2, c: 1, d: 2 }, { a: 1, b: 2, c: 5, d: 6 }] },
        { dataType: { a: 3, b: 4 }, values: [{ a: 3, b: 4, c: 3, d: 4 }, { a: 3, b: 4, c: 7, d: 8 }] }
      ]);
    });

    it("값 셀렉터를 입력하여, 객체의 형식을 변경할 수 있다.", () => {
      const arr = [
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 },
        { a: 1, b: 2, c: 5, d: 6 },
        { a: 3, b: 4, c: 7, d: 8 }
      ];

      expect(
        arr.groupBy(
          (item) => ({ a: item.a, b: item.b }),
          (item) => ({ c: item.c, d: item.d })
        )
      ).to.deep.equal([
        { dataType: { a: 1, b: 2 }, values: [{ c: 1, d: 2 }, { c: 5, d: 6 }] },
        { dataType: { a: 3, b: 4 }, values: [{ c: 3, d: 4 }, { c: 7, d: 8 }] }
      ]);
    });
  });

  describe("toMap", () => {
    it("키 셀렉터를 사용하여 Map<key, value> 로 데이터를 매핑 할 수 있다.", () => {
      const arr = [
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 }
      ];

      expect(
        Array.from(arr.toMap((item) => ({ a: item.a, b: item.b })).entries())
      ).to.deep.equal([
        [{ a: 1, b: 2 }, { a: 1, b: 2, c: 1, d: 2 }],
        [{ a: 3, b: 4 }, { a: 3, b: 4, c: 3, d: 4 }]
      ]);
    });

    it("값 셀렉터를 입력하여, 값 객체의 형식을 변경할 수 있다.", () => {
      const arr = [
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 }
      ];

      expect(
        Array.from(
          arr.toMap(
            (item) => ({ a: item.a, b: item.b }),
            (item) => ({ c: item.c, d: item.d })
          ).entries()
        )
      ).to.deep.equal([
        [{ a: 1, b: 2 }, { c: 1, d: 2 }],
        [{ a: 3, b: 4 }, { c: 3, d: 4 }]
      ]);
    });
  });

  describe("distinct", () => {
    it("동일한 객체들을 하나의 객체로 병합한 결과물을 반환한다. 포인터를 통한 비교가 아닌, 각각의 내부값의 비교로 수행되므로, 클론된 두개의 객체도 같은 객체로 인식한다. 자세한 사항은 ObjectUtil.equal 참고", () => {
      const arr = [
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 },
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 },
        { a: 1, b: 2, c: 1, d: 2 }
      ];

      expect(arr.distinct()).to.deep.equal([
        { a: 1, b: 2, c: 1, d: 2 },
        { a: 3, b: 4, c: 3, d: 4 }
      ]);
    });
  });

  describe("orderBy", () => {
    it("정렬 조건값 셀렉터를 통해 설정된 값들을 비교하여 정렬한다.", () => {
      const arr = [
        { a: 1, b: "2" },
        { a: 3, b: "5" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];

      expect(
        arr.orderBy((item) => item.a)
      ).to.deep.equal([
        { a: 1, b: "2" },
        { a: 2, b: "4" },
        { a: 3, b: "5" },
        { a: 4, b: "1" },
        { a: 5, b: "3" }
      ]).and.to.not.deep.equal(arr);
    });

    it("정렬 조건값으로는, string, number 만 사용할 수 있으므로, Date, DateTime, DateOnly, Time 등을 조건값으로 하려면, tick 을 사용해야 한다", () => {
      const arr = [
        { a: 1, b: new DateTime().addDays(2) },
        { a: 3, b: new DateTime().addDays(5) },
        { a: 4, b: new DateTime().addDays(1) },
        { a: 2, b: new DateTime().addDays(4) },
        { a: 5, b: new DateTime().addDays(3) }
      ];

      expect(
        arr.orderBy((item) => item.b.tick)
      ).to.deep.equal([
        arr[2],
        arr[0],
        arr[4],
        arr[3],
        arr[1]
      ]).and.to.not.deep.equal(arr);
    });

    it("정렬 조건값없이 정렬할 수 있다", () => {
      expect([2, 5, 1, 4, 3].orderBy()).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("정렬 조건값없이 정렬시 항목이 string, number 가 아니면 오류가 발생된다", () => {
      expect(() => {
        [{}, {}, {}, {}].orderBy();
      }).to.throw();
    });
  });

  describe("orderByDesc", () => {
    it("정렬 조건값 셀렉터를 통해 설정된 값들을 비교하여 거꾸로 정렬한다", () => {
      expect([2, 5, 1, 4, 3].orderByDesc()).to.deep.equal([5, 4, 3, 2, 1]);
    });


    it("정렬 조건값으로는, string, number 만 사용할 수 있으므로, Date, DateTime, DateOnly, Time 등을 조건값으로 하려면, tick 을 사용해야 한다", () => {
      const arr = [
        { a: 1, b: new DateTime().addDays(2) },
        { a: 3, b: new DateTime().addDays(5) },
        { a: 4, b: new DateTime().addDays(1) },
        { a: 2, b: new DateTime().addDays(4) },
        { a: 5, b: new DateTime().addDays(3) }
      ];

      expect(
        arr.orderByDesc((item) => item.b.tick)
      ).to.deep.equal([
        arr[1],
        arr[3],
        arr[4],
        arr[0],
        arr[2]
      ]).and.to.not.deep.equal(arr);
    });

    it("정렬 조건값없이 정렬할 수 있다", () => {
      expect(["2", "5", "1", "4", "3"].orderByDesc()).to.deep.equal(["5", "4", "3", "2", "1"]);
    });

    it("정렬 조건값없이 정렬시 항목이 string, number 가 아니면 오류가 발생된다", () => {
      expect(() => {
        [{}, {}, {}, {}].orderByDesc();
      }).to.throw();
    });
  });

  describe("diffs", () => {
    it("비교대상 Array 와의 차이점을 추려낸다. source/target 으로 추려내며,"
      + " source 만 있는것은 삭제, target 만 있는것은 추가된 데이터로 볼 수 있다.", () => {
      const arr1 = [
        { a: 1, b: "2" },
        // {a: 3, b: "5"},
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];
      const arr2 = [
        { a: 1, b: "2" },
        { a: 3, b: "5" },
        { a: 4, b: "1" },
        // {a: 2, b: "4"},
        { a: 5, b: "3" }
      ];

      expect(arr1.diffs(arr2)).to.deep.equal([
        { source: { a: 2, b: "4" } },
        { target: { a: 3, b: "5" } }
      ]);
    });

    it("데이터의 순서는 비교하지 않으며, source 와 target 사이의 데이터 존재여부 및 변경여부만 확인한다.", () => {
      const arr1 = [
        { a: 1, b: "2" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];
      const arr2 = [
        { a: 4, b: "1" },
        { a: 3, b: "5" },
        { a: 5, b: "3" },
        { a: 1, b: "2" }
      ];

      expect(arr1.diffs(arr2)).to.deep.equal([
        { source: { a: 2, b: "4" } },
        { target: { a: 3, b: "5" } }
      ]);
    });

    it("keys 옵션을 통해, 비교 키가될 Property 목록을 설정할 수 있다. "
      + "비교 키가 설정되면, 키가 같은것이 source/target 양쪽에 동시에 있는경우, 값을 비교하고, "
      + "변경사항이 있는경우, source/target 모두를 반환한다. "
      + "이 경우, 수정된 데이터로 볼 수 있다. "
      + "내부적으로 ObjectUtil.equal 은 사용하므로, ObjectUtil.equal 참고", () => {
      const arr1 = [
        { a: 1, b: "2" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];
      const arr2 = [
        { a: 4, b: "1" },
        { a: 3, b: "5" },
        { a: 5, b: "9" },
        { a: 1, b: "2" }
      ];

      expect(arr1.diffs(arr2, { keys: ["a"] })).to.deep.equal([
        { source: { a: 2, b: "4" } },
        { source: { a: 5, b: "3" }, target: { a: 5, b: "9" } },
        { target: { a: 3, b: "5" } }
      ]);
    });

    it("excludes 옵션을 통해, 변경사항 비교에서 특성 속성을 제외할 수 있다. "
      + "제외된 속성의 값이 다르더라도, 다른 속성이 모두 같다면 변경사항이 전혀 없는것으로 간주된다.", () => {
      const arr1 = [
        { a: 1, b: "2" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];
      const arr2 = [
        { a: 4, b: "1" },
        { a: 3, b: "5" },
        { a: 5, b: "9" },
        { a: 1, b: "2" }
      ];

      expect(arr1.diffs(arr2, { excludes: ["b"] })).to.deep.equal([
        { source: { a: 2, b: "4" } },
        { target: { a: 3, b: "5" } }
      ]);
    });
  });

  describe("merge", () => {
    it("대상 Array 를 병합하여 반환한다. "
      + "기존 Array 와 동일하지 않은 데이터가 대상 Array 에 있다면, 반환배열 맨 뒤에 새롭게 추가된다. "
      + "또한, keys 를 통해 변경된 데이터가 있는지 체크하고 "
      + "생성/수정/삭제의 구분은 diffs 를 활용하여 비교하므로, "
      + "옵션은 diffs 의 설정을 따른며, diffs 를 하는데에만 사용된다.(diffs 참고)", () => {
      const arr1 = [
        { a: 1, b: "2" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "3" }
      ];
      const arr2 = [
        { a: 4, b: "1" },
        { a: 3, b: "5" },
        { a: 5, b: "9" },
        { a: 1, b: "2" }
      ];

      expect(arr1.merge(arr2, { keys: ["a"] })).to.deep.equal([
        { a: 1, b: "2" },
        { a: 4, b: "1" },
        { a: 2, b: "4" },
        { a: 5, b: "9" },
        { a: 3, b: "5" }
      ]);
    });

    it("각 객체 수정에 따른 시에는 ObjectUtil.merge 를 사용하므로 참고", () => {
      const arr1 = [
        { a: 1, b: 2, c: { d: 3, f: 4 } }
      ];
      const arr2 = [
        { a: 1, b: 2, c: { d: 5, f: 4 } }
      ];

      expect(arr1.merge(arr2, { keys: ["a"] })).to.deep.equal([
        { a: 1, b: 2, c: { d: 5, f: 4 } }
      ]);
    });
  });

  describe("sum", () => {
    it("값 셀렉터를 통해 합산할 값을 선택하고, 해당 값을 모두 '+' 하여 반환한다.", () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }];
      expect(arr.sum((item) => item.a)).to.equal(10);
    });

    it("값 셀렉터는 옵션으로, 설정하지 않은경우, 내용물 자체를 값으로 보고 합산하여 출력한다.", () => {
      const arr = [1, 2, 3, 4];
      expect(arr.sum()).to.equal(10);
    });

    it("값 셀렉터를 설정하지 않은경우, 기본 타입이 number 가 아니면 오류가 발생된다", () => {
      const arr = [{}, {}, {}, {}];
      expect(() => {
        arr.sum();
      }).to.throw();
    });

    it("빈 Array 가 입력될 경우, 0이 반환된다", () => {
      expect([].sum()).to.equal(0);
    });
  });

  describe("min", () => {
    it("값 셀렉터를 통해 최소값을 가져올 방법을 설정하고, 해당 값중 최소값을 반환한다.", () => {
      const arr = [{ a: 2 }, { a: 3 }, { a: 4 }, { a: 1 }];
      expect(arr.min((item) => item.a)).to.equal(1);
    });

    it("값 셀렉터는 옵션으로, 설정하지 않은경우, 내용물 자체를 값으로 보고 최소값을 반환한다.", () => {
      const arr = [2, 3, 4, 1];
      expect(arr.min()).to.equal(1);
    });

    it("값 셀렉터를 설정하지 않은경우, 기본 타입이 number 가 아니면 오류가 발생된다", () => {
      const arr = [{}, {}, {}, {}];
      expect(() => {
        arr.min();
      }).to.throw();
    });

    it("빈 Array 가 입력될 경우, undefined 가 반환된다", () => {
      expect([].min()).to.equal(undefined);
    });
  });

  describe("max", () => {
    it("값 셀렉터를 통해 최대값을 가져올 방법을 설정하고, 해당 값중 최대값을 반환한다.", () => {
      const arr = [{ a: 2 }, { a: 3 }, { a: 4 }, { a: 1 }];
      expect(arr.max((item) => item.a)).to.equal(4);
    });

    it("값 셀렉터는 옵션으로, 설정하지 않은경우, 내용물 자체를 값으로 보고 최대값을 출력한다.", () => {
      const arr = [2, 3, 4, 1];
      expect(arr.max()).to.equal(4);
    });

    it("값 셀렉터를 설정하지 않은경우, 기본 타입이 number 가 아니면 오류가 발생된다", () => {
      const arr = [{}, {}, {}, {}];
      expect(() => {
        arr.max();
      }).to.throw();
    });

    it("빈 Array 가 입력될 경우, undefined 가 반환된다", () => {
      expect([].max()).to.equal(undefined);
    });
  });

  describe("shuffle", () => {
    it("내용물을 무작위로 섞은 결과물을 반환한다", () => {
      const arr = [1, 2, 3, 4];
      expect(arr.shuffle().length).to.equal(4);
      expect(arr.shuffle()).to.not.deep.equal(arr);
    });
  });

  describe("insert", () => {
    it("특정 index 에 값을 등록한다. 이미 있던 값들이 index 에서 부터 한깐씩 밀린다. "
      + "기존 데이터 자체가 수정되며, 자기자신(this)이 반환된다", () => {
      const arr = [1, 2, 3, 4, 5];

      expect(arr.insert(1, 6))
        .to.deep.equal([1, 6, 2, 3, 4, 5])
        .and.to.equal(arr);
    });
  });

  describe("remove", () => {
    it("특정 값을 목록에서 삭제한다. 포인터를 사용하므로, 완전히 동일한 값만 삭제된다. "
      + "기존 데이터 자체가 수정되며, 자기자신(this)이 반환된다.", () => {
      const obj = { a: 2 };
      const arr = [{ a: 1 }, obj, { a: 3 }, { a: 4 }, obj];
      expect(arr.remove({ a: 2 })).to.deep.equal([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 2 }]);
      expect(arr.remove(obj))
        .to.deep.equal([{ a: 1 }, { a: 3 }, { a: 4 }])
        .and.to.equal(arr);
    });

    it("조건문을 통해, 조건문에 부합하는 데이터만 삭제할 수도 있다.", () => {
      const obj = { a: 2 };
      const arr = [{ a: 1 }, obj, { a: 3 }, { a: 4 }, obj];
      expect(arr.remove((item) => item.a === 2))
        .to.deep.equal([{ a: 1 }, { a: 3 }, { a: 4 }])
        .and.to.equal(arr);
    });
  });

  describe("clear", () => {
    it("목록을 완전히 비운다. 기존 데이터 자체가 수정되며, 자기자신(this)이 반환된다.", () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }];
      expect(arr.clear())
        .to.deep.equal([])
        .and.to.equal(arr);
    });
  });
});