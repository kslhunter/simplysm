import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Collapse } from "../../../src/components/navigator/collapse/collapse";

describe("Collapse", () => {
  describe("열림/닫힘 상태", () => {
    it("open=true일 때 콘텐츠가 보인다", () => {
      render(() => (
        <Collapse open={true}>
          <div>펼쳐진 내용</div>
        </Collapse>
      ));

      expect(screen.getByText("펼쳐진 내용")).toBeVisible();
    });

    it("open=false일 때 콘텐츠가 숨겨진다", () => {
      render(() => (
        <Collapse open={false}>
          <div>숨겨진 내용</div>
        </Collapse>
      ));

      // height: 0px로 숨겨지고 data-collapsed 속성이 있음
      const container = screen.getByText("숨겨진 내용").parentElement?.parentElement;
      expect(container).toHaveAttribute("data-collapsed");
    });

    it("open 상태가 변경되면 콘텐츠 표시가 토글된다", async () => {
      const [open, setOpen] = createSignal(false);

      render(() => (
        <Collapse open={open()}>
          <div>토글 내용</div>
        </Collapse>
      ));

      // 초기: 닫힘
      let container = screen.getByText("토글 내용").parentElement?.parentElement;
      expect(container).toHaveAttribute("data-collapsed");

      // 열기
      setOpen(true);
      await new Promise((r) => setTimeout(r, 50)); // 상태 업데이트 대기

      container = screen.getByText("토글 내용").parentElement?.parentElement;
      expect(container).not.toHaveAttribute("data-collapsed");
    });
  });
});
