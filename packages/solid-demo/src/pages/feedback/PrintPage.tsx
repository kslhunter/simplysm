import { type Component, createSignal, onMount } from "solid-js";
import { Button, Print, usePrint, usePrintInstance } from "@simplysm/solid";

function AsyncReadyContent() {
  const print = usePrintInstance();
  onMount(() => {
    setTimeout(() => print?.ready(), 1000);
  });
  return (
    <Print>
      <Print.Page>
        <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
          <h1>Async Data PDF</h1>
          <p>After waiting 1 second, ready() is called and a PDF is generated.</p>
          <div
            style={{
              "margin-top": "20px",
              "padding": "20px",
              "background": "#e8eaf6",
              "border-radius": "8px",
            }}
          >
            <p>This simulates rendering after data loading is complete.</p>
          </div>
        </div>
      </Print.Page>
    </Print>
  );
}

const PrintDemo: Component = () => {
  const { toPrinter, toPdf } = usePrint();

  const [status, setStatus] = createSignal("");

  const handlePrint = async () => {
    setStatus("Printing...");
    try {
      await toPrinter(() => (
        <Print>
          <Print.Page>
            <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
              <h1>Print Test</h1>
              <p>This page is a toPrinter test.</p>
              <table style={{ "border-collapse": "collapse", "width": "100%" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Name</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Age</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Occupation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>John Doe</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>30</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>Developer</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>Jane Smith</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>25</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>Designer</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Print.Page>
        </Print>
      ));
      setStatus("Print completed");
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
  };

  const handlePdfSingle = async () => {
    setStatus("Creating PDF...");
    try {
      const buf = await toPdf(() => (
        <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
          <h1>Single Page PDF</h1>
          <p>Convert simple content to PDF without Print component.</p>
          <div
            style={{
              "margin-top": "20px",
              "padding": "20px",
              "background": "#f0f8ff",
              "border-radius": "8px",
            }}
          >
            <p>Auto-split test: Without Print.Page, automatically sliced based on A4 height.</p>
          </div>
        </div>
      ));
      downloadPdf(buf, "single-page.pdf");
      setStatus(`PDF created (${buf.length} bytes)`);
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
  };

  const handlePdfMultiPage = async () => {
    setStatus("Creating multi-page PDF...");
    try {
      const buf = await toPdf(
        () => (
          <Print>
            <Print.Page>
              <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
                <h1>Page 1</h1>
                <p>This is the first page.</p>
                <div
                  style={{
                    "margin-top": "20px",
                    "height": "200px",
                    "background": "#e8f5e9",
                    "border-radius": "8px",
                    "display": "flex",
                    "align-items": "center",
                    "justify-content": "center",
                  }}
                >
                  <span style={{ "font-size": "24px", "color": "#2e7d32" }}>Page 1 Content</span>
                </div>
              </div>
            </Print.Page>
            <Print.Page>
              <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
                <h1>Page 2</h1>
                <p>This is the second page.</p>
                <div
                  style={{
                    "margin-top": "20px",
                    "height": "200px",
                    "background": "#fff3e0",
                    "border-radius": "8px",
                    "display": "flex",
                    "align-items": "center",
                    "justify-content": "center",
                  }}
                >
                  <span style={{ "font-size": "24px", "color": "#e65100" }}>Page 2 Content</span>
                </div>
              </div>
            </Print.Page>
            <Print.Page>
              <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
                <h1>Page 3</h1>
                <p>This is the third page.</p>
                <div
                  style={{
                    "margin-top": "20px",
                    "height": "200px",
                    "background": "#e3f2fd",
                    "border-radius": "8px",
                    "display": "flex",
                    "align-items": "center",
                    "justify-content": "center",
                  }}
                >
                  <span style={{ "font-size": "24px", "color": "#1565c0" }}>Page 3 Content</span>
                </div>
              </div>
            </Print.Page>
          </Print>
        ),
        { size: "A4" },
      );
      downloadPdf(buf, "multi-page.pdf");
      setStatus(`Multi-page PDF created (${buf.length} bytes, 3 pages)`);
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
  };

  const handlePdfLandscape = async () => {
    setStatus("가로 방향 PDF 생성 중...");
    try {
      const buf = await toPdf(
        () => (
          <Print>
            <Print.Page>
              <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
                <h1>가로 방향 (Landscape)</h1>
                <p>A4 가로 방향 PDF 테스트입니다.</p>
                <div style={{ "display": "flex", "gap": "20px", "margin-top": "20px" }}>
                  <div
                    style={{
                      "flex": "1",
                      "height": "150px",
                      "background": "#f3e5f5",
                      "border-radius": "8px",
                      "display": "flex",
                      "align-items": "center",
                      "justify-content": "center",
                    }}
                  >
                    왼쪽 영역
                  </div>
                  <div
                    style={{
                      "flex": "1",
                      "height": "150px",
                      "background": "#fce4ec",
                      "border-radius": "8px",
                      "display": "flex",
                      "align-items": "center",
                      "justify-content": "center",
                    }}
                  >
                    오른쪽 영역
                  </div>
                </div>
              </div>
            </Print.Page>
          </Print>
        ),
        { size: "A4 landscape" },
      );
      downloadPdf(buf, "landscape.pdf");
      setStatus(`가로 방향 PDF 생성 완료 (${buf.length} bytes)`);
    } catch (e) {
      setStatus(`에러: ${e}`);
    }
  };

  const handlePdfWithReady = async () => {
    setStatus("비동기 데이터 로딩 후 PDF 생성...");
    try {
      const buf = await toPdf(() => <AsyncReadyContent />);
      downloadPdf(buf, "async-ready.pdf");
      setStatus(`비동기 PDF 생성 완료 (${buf.length} bytes)`);
    } catch (e) {
      setStatus(`에러: ${e}`);
    }
  };

  return (
    <div class="space-y-8">
      {/* toPrinter */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">toPrinter</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          window.print()를 사용하여 브라우저 인쇄 대화상자를 표시합니다.
        </p>
        <Button theme="primary" variant="solid" onClick={handlePrint}>
          인쇄하기
        </Button>
      </section>

      {/* toPdf - Single page (auto split) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          toPdf - 단일 (자동 분할)
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print 컴포넌트 없이 콘텐츠를 PDF로 변환합니다. A4 높이 기준 자동 분할.
        </p>
        <Button theme="primary" variant="outline" onClick={handlePdfSingle}>
          PDF 다운로드 (단일)
        </Button>
      </section>

      {/* toPdf - Multiple pages */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          toPdf - 다중 페이지
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print.Page로 명시적으로 3페이지를 분할합니다.
        </p>
        <Button theme="primary" variant="outline" onClick={handlePdfMultiPage}>
          PDF 다운로드 (3페이지)
        </Button>
      </section>

      {/* toPdf - Landscape */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">toPdf - 가로 방향</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          size: "A4 landscape" 옵션으로 가로 방향 PDF를 생성합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handlePdfLandscape}>
          PDF 다운로드 (가로)
        </Button>
      </section>

      {/* toPdf - Async ready */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          toPdf - 비동기 ready
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print ready 시그널을 사용하여 1초 후 데이터 로딩이 완료된 뒤 PDF를 생성합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handlePdfWithReady}>
          PDF 다운로드 (비동기)
        </Button>
      </section>

      {/* Status display */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">상태</h2>
        <div class="rounded border border-base-200 p-4 font-mono text-sm dark:border-base-700">
          {status() || "대기 중..."}
        </div>
      </section>
    </div>
  );
};

function downloadPdf(buf: Uint8Array, filename: string) {
  const blob = new Blob([buf as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PrintPage() {
  return (
    <div class="space-y-8 p-6">
      <PrintDemo />
    </div>
  );
}
