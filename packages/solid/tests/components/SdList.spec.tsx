import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { SdList } from "../../src/components/SdList";

describe("SdList", () => {
  afterEach(() => {
    cleanup();
  });

  it("기본 렌더링", () => {
    const { container } = render(() => <SdList>리스트 내용</SdList>);
    const list = container.firstChild as HTMLElement;

    expect(list).toBeDefined();
    expect(list.textContent).toBe("리스트 내용");
  });

  it("기본 스타일 적용", () => {
    const { container } = render(() => <SdList>내용</SdList>);
    const list = container.firstChild as HTMLElement;

    expect(list.className).toContain("flex");
    expect(list.className).toContain("flex-col");
    expect(list.className).toContain("select-none");
  });

  it("inset=false (기본값) - 배경색 적용", () => {
    const { container } = render(() => <SdList>내용</SdList>);
    const list = container.firstChild as HTMLElement;

    expect(list.className).toContain("bg-bg-elevated");
    expect(list.getAttribute("data-sd-inset")).toBe("false");
  });

  it("inset=true - 투명 배경", () => {
    const { container } = render(() => <SdList inset>내용</SdList>);
    const list = container.firstChild as HTMLElement;

    expect(list.className).toContain("bg-transparent");
    expect(list.getAttribute("data-sd-inset")).toBe("true");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => <SdList class="custom-class">내용</SdList>);
    const list = container.firstChild as HTMLElement;

    expect(list.className).toContain("custom-class");
    expect(list.className).toContain("flex"); // 기본 스타일도 유지
  });

  it("children 렌더링", () => {
    const { container } = render(() => (
      <SdList>
        <div>아이템 1</div>
        <div>아이템 2</div>
      </SdList>
    ));
    const list = container.firstChild as HTMLElement;

    expect(list.children.length).toBe(2);
    expect(list.children[0].textContent).toBe("아이템 1");
    expect(list.children[1].textContent).toBe("아이템 2");
  });

  it("추가 props 전달", () => {
    const { container } = render(() => (
      <SdList data-custom="value">
        내용
      </SdList>
    ));
    const list = container.firstChild as HTMLElement;

    expect(list.getAttribute("data-custom")).toBe("value");
  });
});
