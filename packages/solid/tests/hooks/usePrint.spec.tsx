import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { onMount } from "solid-js";
import { BusyProvider } from "../../src/components/feedback/busy/BusyProvider";
import { PrintProvider } from "../../src/components/feedback/print/PrintProvider";
import { usePrint } from "../../src/hooks/usePrint";
import { Print } from "../../src/components/feedback/print/Print";
import { usePrintInstance } from "../../src/components/feedback/print/PrintInstanceContext";

// window.print 모킹
vi.stubGlobal("print", vi.fn());

describe("usePrint", () => {
  describe("훅 인터페이스", () => {
    it("toPrinter와 toPdf 함수를 반환한다", () => {
      let result: ReturnType<typeof usePrint> | undefined;

      render(() => (
        <BusyProvider>
          <PrintProvider>
            {(() => {
              result = usePrint();
              return <div />;
            })()}
          </PrintProvider>
        </BusyProvider>
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
        <BusyProvider>
          <PrintProvider>
            {(() => {
              const { toPrinter } = usePrint();
              printFn = toPrinter;
              return <div />;
            })()}
          </PrintProvider>
        </BusyProvider>
      ));

      await printFn!(() => <div>테스트 내용</div>);
      expect(window.print).toHaveBeenCalled();
    });

    it("usePrintInstance().ready() 대기 후 인쇄한다", async () => {
      let printFn: ReturnType<typeof usePrint>["toPrinter"] | undefined;

      render(() => (
        <BusyProvider>
          <PrintProvider>
            {(() => {
              const { toPrinter } = usePrint();
              printFn = toPrinter;
              return <div />;
            })()}
          </PrintProvider>
        </BusyProvider>
      ));

      function AsyncContent() {
        const print = usePrintInstance();
        onMount(() => {
          setTimeout(() => print?.ready(), 50);
        });
        return <div>내용</div>;
      }

      await printFn!(() => <AsyncContent />);
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("toPdf", () => {
    it("Uint8Array를 반환한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <BusyProvider>
          <PrintProvider>
            {(() => {
              const { toPdf } = usePrint();
              pdfFn = toPdf;
              return <div />;
            })()}
          </PrintProvider>
        </BusyProvider>
      ));

      const result = await pdfFn!(() => <div>PDF 내용</div>);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("Print.Page로 다중 페이지 PDF를 생성한다", async () => {
      let pdfFn: ReturnType<typeof usePrint>["toPdf"] | undefined;

      render(() => (
        <BusyProvider>
          <PrintProvider>
            {(() => {
              const { toPdf } = usePrint();
              pdfFn = toPdf;
              return <div />;
            })()}
          </PrintProvider>
        </BusyProvider>
      ));

      const result = await pdfFn!(() => (
        <Print>
          <Print.Page>
            <div style={{ height: "100px" }}>페이지 1</div>
          </Print.Page>
          <Print.Page>
            <div style={{ height: "100px" }}>페이지 2</div>
          </Print.Page>
        </Print>
      ));

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
