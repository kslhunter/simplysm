import { describe, it, expect } from "vitest";
import { children, createRoot } from "solid-js";
import { splitSlots } from "../../src/utils/splitSlots";

describe("splitSlots", () => {
  describe("기본 동작", () => {
    it("빈 children일 때 모든 slot 배열과 content가 비어있음", () => {
      createRoot((dispose) => {
        const resolved = children(() => null);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toEqual([]);
        expect(content()).toEqual([]);

        dispose();
      });
    });

    it("slot 키에 매칭되는 요소가 해당 배열에 추가됨", () => {
      createRoot((dispose) => {
        const el = document.createElement("div");
        el.dataset["testSlot"] = "";

        const resolved = children(() => el);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toHaveLength(1);
        expect(slots().testSlot[0]).toBe(el);
        expect(content()).toEqual([]);

        dispose();
      });
    });

    it("매칭되지 않는 요소는 content에 추가됨", () => {
      createRoot((dispose) => {
        const el = document.createElement("div");

        const resolved = children(() => el);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toEqual([]);
        expect(content()).toHaveLength(1);
        expect(content()[0]).toBe(el);

        dispose();
      });
    });

    it("여러 개의 같은 slot 키 요소가 모두 배열에 추가됨", () => {
      createRoot((dispose) => {
        const el1 = document.createElement("div");
        el1.dataset["testSlot"] = "";
        const el2 = document.createElement("div");
        el2.dataset["testSlot"] = "";

        const resolved = children(() => [el1, el2]);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toHaveLength(2);
        expect(slots().testSlot[0]).toBe(el1);
        expect(slots().testSlot[1]).toBe(el2);
        expect(content()).toEqual([]);

        dispose();
      });
    });
  });

  describe("여러 slot 키 처리", () => {
    it("각 slot 키에 맞는 요소가 분류됨", () => {
      createRoot((dispose) => {
        const header = document.createElement("div");
        header.dataset["selectHeader"] = "";
        const button = document.createElement("button");
        button.dataset["selectAction"] = "";
        const item = document.createElement("span");

        const resolved = children(() => [header, button, item]);
        const [slots, content] = splitSlots(resolved, ["selectHeader", "selectAction"] as const);

        expect(slots().selectHeader).toHaveLength(1);
        expect(slots().selectHeader[0]).toBe(header);
        expect(slots().selectAction).toHaveLength(1);
        expect(slots().selectAction[0]).toBe(button);
        expect(content()).toHaveLength(1);
        expect(content()[0]).toBe(item);

        dispose();
      });
    });

    it("정의되지 않은 slot 키의 data 속성은 content로 분류됨", () => {
      createRoot((dispose) => {
        const el = document.createElement("div");
        el.dataset["unknownSlot"] = "";

        const resolved = children(() => el);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toEqual([]);
        expect(content()).toHaveLength(1);
        expect(content()[0]).toBe(el);

        dispose();
      });
    });
  });

  describe("non-HTMLElement 처리", () => {
    it("텍스트 노드는 content로 분류됨", () => {
      createRoot((dispose) => {
        const textNode = document.createTextNode("hello");

        const resolved = children(() => textNode);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toEqual([]);
        expect(content()).toHaveLength(1);

        dispose();
      });
    });

    it("혼합된 요소들이 올바르게 분류됨", () => {
      createRoot((dispose) => {
        const slotEl = document.createElement("div");
        slotEl.dataset["testSlot"] = "";
        const normalEl = document.createElement("span");
        const textNode = document.createTextNode("text");

        const resolved = children(() => [slotEl, normalEl, textNode]);
        const [slots, content] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot).toHaveLength(1);
        expect(slots().testSlot[0]).toBe(slotEl);
        expect(content()).toHaveLength(2);

        dispose();
      });
    });
  });

  describe("single() 확장 메서드 사용", () => {
    it("단일 요소일 때 single()이 해당 요소를 반환", () => {
      createRoot((dispose) => {
        const el = document.createElement("div");
        el.dataset["testSlot"] = "";

        const resolved = children(() => el);
        const [slots] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot.single()).toBe(el);

        dispose();
      });
    });

    it("요소가 없을 때 single()이 undefined를 반환", () => {
      createRoot((dispose) => {
        const resolved = children(() => null);
        const [slots] = splitSlots(resolved, ["testSlot"] as const);

        expect(slots().testSlot.single()).toBeUndefined();

        dispose();
      });
    });
  });

  describe("data 속성 네이밍", () => {
    it("camelCase slot 키가 data 속성과 매칭됨 (listItemChildren -> data-list-item-children)", () => {
      createRoot((dispose) => {
        const el = document.createElement("div");
        // HTML에서 data-list-item-children은 dataset.listItemChildren으로 접근
        el.dataset["listItemChildren"] = "";

        const resolved = children(() => el);
        const [slots] = splitSlots(resolved, ["listItemChildren"] as const);

        expect(slots().listItemChildren).toHaveLength(1);
        expect(slots().listItemChildren[0]).toBe(el);

        dispose();
      });
    });
  });
});
