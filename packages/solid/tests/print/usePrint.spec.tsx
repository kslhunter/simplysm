import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { LoadingProvider } from "../../src/components/feedback/loading/LoadingProvider";
import { usePrint } from "../../src/contexts/usePrint";
import { Print } from "../../src/components/print/Print";

// window.print 모킹
vi.stubGlobal("print", vi.fn());

describe("usePrint", () => {
  describe("훅 인터페이스", () => {
    it("toPrinter와 toPdf 함수를 반환한다", () => {
      let result: ReturnType<typeof usePrint> | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            result = usePrint();
            return <div />;
          })()}
        </LoadingProvider>
      ));

      expect(result).toBeDefined();
      expect(typeof result!.toPrinter).toBe("function");
      expect(typeof result!.toPdf).toBe("function");
    });
  });

  describe("toPrinter", () => {
    it("Print 없는 단순 콘텐츠를 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      await printFn!(() => <div>테스트 내용</div>);
      expect(window.print).toHaveBeenCalled();
    });

    it("Print ready 대기 후 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPrinter } = usePrint();
            printFn = toPrinter;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      await printFn!(() => {
        const [ready, setReady] = createSignal(false);
        setTimeout(() => setReady(true), 50);
        return <Print ready={ready()}>내용</Print>;
      });

      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("toPdf", () => {
    it("Uint8Array를 반환한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      const result = await pdfFn!(() => <div>PDF 내용</div>);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("Print.Page로 다중 페이지 PDF를 생성한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <LoadingProvider>
          {(() => {
            const { toPdf } = usePrint();
            pdfFn = toPdf;
            return <div />;
          })()}
        </LoadingProvider>
      ));

      const result = await pdfFn!(() => (
        <Print>
          <Print.Page><div style={{ height: "100px" }}>페이지 1</div></Print.Page>
          <Print.Page><div style={{ height: "100px" }}>페이지 2</div></Print.Page>
        </Print>
      ));

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
