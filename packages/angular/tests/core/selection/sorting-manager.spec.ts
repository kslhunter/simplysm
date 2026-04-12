import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSortingManager, type SortingDef } from "../../../src/core/selection/useSortingManager";

interface Item {
  name: string;
  age: number;
}

describe("useSortingManager", () => {
  it("toggle: 미정렬 → 오름차순", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([]);
    const manager = useSortingManager({ sorts });

    manager.toggle("name", false);
    expect(sorts()).toEqual([{ key: "name", desc: false }]);
  });

  it("toggle: 오름차순 → 내림차순", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: false }]);
    const manager = useSortingManager({ sorts });

    manager.toggle("name", false);
    expect(sorts()).toEqual([{ key: "name", desc: true }]);
  });

  it("toggle: 내림차순 → 정렬 해제", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: true }]);
    const manager = useSortingManager({ sorts });

    manager.toggle("name", false);
    expect(sorts()).toEqual([]);
  });

  it("toggle (multiple=true): Shift+클릭으로 다중 정렬 추가", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: false }]);
    const manager = useSortingManager({ sorts });

    manager.toggle("age", true);
    expect(sorts()).toEqual([
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);
  });

  it("toggle (multiple=true): 기존 다중 정렬 컬럼을 내림차순으로", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);
    const manager = useSortingManager({ sorts });

    manager.toggle("age", true);
    expect(sorts()).toEqual([
      { key: "name", desc: false },
      { key: "age", desc: true },
    ]);
  });

  it("toggle (multiple=true): 다중 정렬에서 컬럼 제거", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([
      { key: "name", desc: false },
      { key: "age", desc: true },
    ]);
    const manager = useSortingManager({ sorts });

    manager.toggle("age", true);
    expect(sorts()).toEqual([{ key: "name", desc: false }]);
  });

  it("sort: 오름차순 정렬", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: false }]);
    const manager = useSortingManager({ sorts });

    const items: Item[] = [
      { name: "Charlie", age: 30 },
      { name: "Alice", age: 25 },
      { name: "Bob", age: 35 },
    ];

    const sorted = manager.sort(items);
    expect(sorted.map((i) => i.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sort: 내림차순 정렬", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: true }]);
    const manager = useSortingManager({ sorts });

    const items: Item[] = [
      { name: "Alice", age: 25 },
      { name: "Charlie", age: 30 },
      { name: "Bob", age: 35 },
    ];

    const sorted = manager.sort(items);
    expect(sorted.map((i) => i.name)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("sort: 다중 정렬 (이름 오름, 나이 오름)", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);
    const manager = useSortingManager({ sorts });

    const items: Item[] = [
      { name: "Alice", age: 30 },
      { name: "Alice", age: 25 },
      { name: "Bob", age: 20 },
    ];

    const sorted = manager.sort(items);
    expect(sorted).toEqual([
      { name: "Alice", age: 25 },
      { name: "Alice", age: 30 },
      { name: "Bob", age: 20 },
    ]);
  });

  it("sort: 정렬 없으면 원본 그대로", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([]);
    const manager = useSortingManager({ sorts });

    const items: Item[] = [
      { name: "Charlie", age: 30 },
      { name: "Alice", age: 25 },
    ];

    const sorted = manager.sort(items);
    expect(sorted).toEqual(items);
  });

  it("defMap: 단일 정렬이면 indexText가 undefined", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: false }]);
    const manager = useSortingManager({ sorts });

    const map = manager.defMap();
    expect(map.get("name")?.indexText).toBeUndefined();
    expect(map.get("name")?.desc).toBe(false);
  });

  it("defMap: 다중 정렬이면 indexText가 순서 번호", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([
      { key: "name", desc: false },
      { key: "age", desc: true },
    ]);
    const manager = useSortingManager({ sorts });

    const map = manager.defMap();
    expect(map.get("name")?.indexText).toBe("1");
    expect(map.get("age")?.indexText).toBe("2");
  });

  it("sort: null 값은 앞으로 정렬", () => {
    TestBed.configureTestingModule({});
    const sorts = signal<SortingDef[]>([{ key: "name", desc: false }]);
    const manager = useSortingManager({ sorts });

    const items = [
      { name: "Bob", age: 30 },
      { name: null as unknown as string, age: 25 },
      { name: "Alice", age: 35 },
    ];

    const sorted = manager.sort(items);
    expect(sorted[0].name).toBeNull();
  });
});
