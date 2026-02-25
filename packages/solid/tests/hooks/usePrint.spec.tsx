import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { onMount } from "solid-js";
import { BusyProvider } from "../../src/components/feedback/busy/BusyProvider";
import { PrintProvider } from "../../src/components/feedback/print/PrintProvider";
import { usePrint } from "../../src/hooks/usePrint";
import { Print } from "../../src/components/feedback/print/Print";
import { usePrintInstance } from "../../src/components/feedback/print/PrintInstanceContext";

// Mock window.print
vi.stubGlobal("print", vi.fn());

describe("usePrint", () => {
  describe("Hook interface", () => {
    it("returns toPrinter and toPdf functions", () => {
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
    it("prints simple content without Print", async () => {
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

      await printFn!(() => <div>test content</div>);
      expect(window.print).toHaveBeenCalled();
    });

    it("prints after waiting for usePrintInstance().ready()", async () => {
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
        return <div>content</div>;
      }

      await printFn!(() => <AsyncContent />);
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("toPdf", () => {
    it("returns Uint8Array", async () => {
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

      const result = await pdfFn!(() => <div>PDF content</div>);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("generates multi-page PDF with Print.Page", async () => {
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
            <div style={{ height: "100px" }}>Page 1</div>
          </Print.Page>
          <Print.Page>
            <div style={{ height: "100px" }}>Page 2</div>
          </Print.Page>
        </Print>
      ));

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
