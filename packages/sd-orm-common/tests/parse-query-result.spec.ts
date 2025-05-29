import { DateOnly, Uuid } from "@simplysm/sd-core-common";
import { describe, expect, it } from "vitest";
import { SdOrmUtils } from "../src";

describe("SdOrmUtils.parseQueryResult<any>", () => {
  it("should parse primitive types correctly", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [{ id: "1", date: "2025-01-01", isEnabled: "true", amount: "123.45" }],
      {
        columns: {
          id: { dataType: "Uuid" },
          date: { dataType: "DateOnly" },
          isEnabled: { dataType: "Boolean" },
          amount: { dataType: "Number" },
        },
      },
    );

    expect(result[0].id).toBeInstanceOf(Uuid);
    expect(result[0].date).toBeInstanceOf(DateOnly);
    expect(result[0].isEnabled).toBe(true);
    expect(result[0].amount).toBeCloseTo(123.45);
  });

  it("should ignore rows with null or undefined values only", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        { id: null, value: undefined },
        { id: "abc", value: "test" },
      ],
      {
        columns: {
          id: { dataType: "String" },
          value: { dataType: "String" },
        },
      },
    );

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("abc");
  });

  it("should reconstruct simple isSingle join", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          "user.name": "John",
        },
        {
          "id": "2",
          "user.id": "u2",
          "user.name": "Jane",
        },
      ],
      {
        joins: {
          user: { isSingle: true },
        },
      },
    );

    expect(result[0]).toEqual({
      id: "1",
      user: {
        id: "u1",
        name: "John",
      },
    });

    expect(result[1]).toEqual({
      id: "2",
      user: {
        id: "u2",
        name: "Jane",
      },
    });
  });

  it("should reconstruct nested joins", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a1",
          "user.address.city": "Seoul",
        },
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a2",
          "user.address.city": "Busan",
        },
      ],
      {
        joins: {
          "user": { isSingle: true },
          "user.address": { isSingle: false },
        },
      },
    );

    expect(result).toEqual([
      {
        id: "1",
        user: {
          id: "u1",
          address: [
            { id: "a1", city: "Seoul" },
            { id: "a2", city: "Busan" },
          ],
        },
      },
    ]);
  });

  it("should split rows when isSingle=true and multiple joined", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          "user.name": "John",
        },
        {
          "id": "1",
          "user.id": "u2",
          "user.name": "Jane",
        },
      ],
      {
        joins: {
          user: { isSingle: true },
        },
      },
    );

    expect(result).toHaveLength(2);
    expect(result[0].user.id).toBe("u1");
    expect(result[1].user.id).toBe("u2");
  });

  it("should deduplicate arrays when isSingle=false", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "tag.id": "t1",
          "tag.name": "tag",
        },
        {
          "id": "1",
          "tag.id": "t1",
          "tag.name": "tag",
        },
      ],
      {
        joins: {
          tag: { isSingle: false },
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0].tag).toEqual([{ id: "t1", name: "tag" }]);
  });

  it("should handle deep nested joins with isSingle and arrays", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a1",
          "user.address.city": "Seoul",
          "user.address.meta.type": "home",
        },
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a1",
          "user.address.city": "Seoul",
          "user.address.meta.type": "home",
        },
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a2",
          "user.address.city": "Busan",
          "user.address.meta.type": "work",
        },
      ],
      {
        joins: {
          "user": { isSingle: true },
          "user.address": { isSingle: false },
          "user.address.meta": { isSingle: true },
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0].user.address).toHaveLength(2);
    expect(result[0].user.address[0].meta.type).toBe("home");
    expect(result[0].user.address[1].meta.type).toBe("work");
  });

  it("should return array even if only one child exists for isSingle: false", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "tags.id": "t1",
          "tags.name": "tag1",
        },
      ],
      {
        joins: {
          tags: { isSingle: false },
        },
      },
    );

    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(result[0].tags.length).toBe(1);
  });

  it("should allow undefined joins when joinKey is missing", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": 1,
          "user.id": undefined,
          "user.name": undefined,
        },
      ],
      {
        joins: {
          user: { isSingle: true },
        },
      },
    );

    expect(result.length).toBe(1);
    expect(result[0].user).toBeUndefined();
  });

  it("should treat join object with same identity but different fields as one (deduplicated)", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "tag.id": "t1",
          "tag.name": "Tag1",
        },
        {
          "id": "1",
          "tag.id": "t1",
          "tag.name": "Tag1", // 중복이므로 하나만 있어야
        },
      ],
      {
        joins: {
          tag: { isSingle: false },
        },
      },
    );

    expect(result[0].tag.length).toBe(1);
  });

  it("should handle deep nested isSingle joins", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          "user.address.id": "a1",
          "user.address.geo.lat": "37.5",
          "user.address.geo.lng": "127.0",
        },
      ],
      {
        joins: {
          "user": { isSingle: true },
          "user.address": { isSingle: true },
          "user.address.geo": { isSingle: true },
        },
      },
    );

    expect(result[0].user.address.geo.lat).toBe("37.5");
  });

  it("joinSingle*2 첫번째 joinSingle undefined일때 테스트", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": 1,
          "user.id": undefined,
          "user.address.id": undefined,
        },
      ],
      {
        joins: {
          "user": { isSingle: true },
          "user.address": { isSingle: true },
        },
      },
    );

    expect(result).toEqual([{ id: 1 }]);
  });

  it("should include partial join objects", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "user.id": "u1",
          // user.name 없음
        },
      ],
      {
        joins: {
          user: { isSingle: true },
        },
      },
    );

    expect(result[0].user.id).toBe("u1");
    expect(result[0].user.name).toBeUndefined();
  });

  it("should merge multiple rows with same parent when isSingle is false", () => {
    const result = SdOrmUtils.parseQueryResult<any>(
      [
        {
          "id": "1",
          "name": "ProductA",
          "tags.id": "t1",
          "tags.name": "Tag1",
        },
        {
          "id": "1",
          "name": "ProductA",
          "tags.id": "t2",
          "tags.name": "Tag2",
        },
        {
          "id": "1",
          "name": "ProductA",
          "tags.id": "t1",
          "tags.name": "Tag1", // 중복된 값 (deduplicated)
        },
      ],
      {
        columns: {
          "id": { dataType: "String" },
          "name": { dataType: "String" },
          "tags.id": { dataType: "String" },
          "tags.name": { dataType: "String" },
        },
        joins: {
          tags: { isSingle: false },
        },
      },
    );

    expect(result).toHaveLength(1); // 병합된 row 하나
    expect(result[0].id).toBe("1");
    expect(result[0].tags).toBeInstanceOf(Array);
    expect(result[0].tags).toHaveLength(2); // 중복 제거됨
    expect(result[0].tags).toEqual(
      expect.arrayContaining([
        { id: "t1", name: "Tag1" },
        { id: "t2", name: "Tag2" },
      ]),
    );
  });
  it("should merge lots into array under single parent row", () => {
    const rawData = [
      {
        "id": 1,
        "name": "품목A",
        "lots.code": "LOT001",
      },
      {
        "id": 1,
        "name": "품목A",
        "lots.code": "LOT002",
      },
      {
        "id": 2,
        "name": "품목B",
        "lots.code": "LOT003",
      },
    ];

    const result = SdOrmUtils.parseQueryResult<any>(rawData, {
      columns: {
        "id": { dataType: "Number" },
        "name": { dataType: "String" },
        "lots.code": { dataType: "String" },
      },
      joins: {
        lots: { isSingle: false },
      },
    });

    // ✅ 결과는 병합된 두 row여야 함
    expect(result).toHaveLength(2);

    const row1 = result.find((r) => r.id === 1);
    const row2 = result.find((r) => r.id === 2);

    expect(row1?.lots).toEqual([{ code: "LOT001" }, { code: "LOT002" }]);

    expect(row2?.lots).toEqual([{ code: "LOT003" }]);
  });

  it("should merge rows by id and group lots into one array", () => {
    const rawData = [
      {
        "id": 2,
        "vendor.name": "(주)신흥오토모티브",
        "lots.code": "EJ001SG1____25052001",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052001",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052002",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052003",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052004",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052005",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052006",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052007",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052008",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052009",
      },
      {
        "id": 1,
        "vendor.name": "(주)엠에스엘",
        "lots.code": "A001SG1_____25052010",
      },
    ];

    const columns = {
      "id": { dataType: "Number" },
      "vendor.name": { dataType: "String" },
      "lots.code": { dataType: "String" },
    };

    const joins = {
      vendor: { isSingle: true },
      lots: { isSingle: false },
    };

    const result = SdOrmUtils.parseQueryResult<any>(rawData, { columns, joins });

    expect(result).toHaveLength(2);

    const row1 = result.find((r) => r.id === 1);
    const row2 = result.find((r) => r.id === 2);

    expect(row1).toBeDefined();
    expect(row2).toBeDefined();

    expect(row1!.vendor.name).toBe("(주)엠에스엘");
    expect(row1!.lots).toHaveLength(10);
    expect(row2!.lots).toHaveLength(1);
    expect(row2!.vendor.name).toBe("(주)신흥오토모티브");
  });
});
