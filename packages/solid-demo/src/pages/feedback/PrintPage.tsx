import { type Component, createSignal, onMount } from "solid-js";
import { Button, Print, Topbar, usePrint, usePrintInstance } from "@simplysm/solid";

function AsyncReadyContent() {
  const print = usePrintInstance();
  onMount(() => {
    setTimeout(() => print?.ready(), 1000);
  });
  return (
    <Print>
      <Print.Page>
        <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
          <h1>비동기 데이터 PDF</h1>
          <p>1초 대기 후 ready()가 호출되어 PDF가 생성됩니다.</p>
          <div
            style={{
              "margin-top": "20px",
              "padding": "20px",
              "background": "#e8eaf6",
              "border-radius": "8px",
            }}
          >
            <p>이 콘텐츠는 데이터 로딩 완료 후 렌더링된 것을 시뮬레이션합니다.</p>
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
    setStatus("인쇄 중...");
    try {
      await toPrinter(() => (
        <Print>
          <Print.Page>
            <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
              <h1>인쇄 테스트</h1>
              <p>이 페이지는 toPrinter 테스트입니다.</p>
              <table style={{ "border-collapse": "collapse", "width": "100%" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>이름</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>나이</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>직업</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>홍길동</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>30</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>개발자</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>김철수</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>25</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>디자이너</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Print.Page>
        </Print>
      ));
      setStatus("인쇄 완료");
    } catch (e) {
      setStatus(`에러: ${e}`);
    }
  };

  const handlePdfSingle = async () => {
    setStatus("PDF 생성 중...");
    try {
      const buf = await toPdf(() => (
        <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
          <h1>단일 페이지 PDF</h1>
          <p>Print 컴포넌트 없이 단순 콘텐츠를 PDF로 변환합니다.</p>
          <div
            style={{
              "margin-top": "20px",
              "padding": "20px",
              "background": "#f0f8ff",
              "border-radius": "8px",
            }}
          >
            <p>자동 분할 테스트: Print.Page 없이 A4 높이 기준으로 자동 슬라이스됩니다.</p>
          </div>
        </div>
      ));
      downloadPdf(buf, "single-page.pdf");
      setStatus(`PDF 생성 완료 (${buf.length} bytes)`);
    } catch (e) {
      setStatus(`에러: ${e}`);
    }
  };

  const handlePdfMultiPage = async () => {
    setStatus("다중 페이지 PDF 생성 중...");
    try {
      const buf = await toPdf(
        () => (
          <Print>
            <Print.Page>
              <div style={{ "padding": "40px", "font-family": "sans-serif" }}>
                <h1>페이지 1</h1>
                <p>첫 번째 페이지입니다.</p>
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
                <h1>페이지 2</h1>
                <p>두 번째 페이지입니다.</p>
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
                <h1>페이지 3</h1>
                <p>세 번째 페이지입니다.</p>
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
      setStatus(`다중 페이지 PDF 생성 완료 (${buf.length} bytes, 3 페이지)`);
    } catch (e) {
      setStatus(`에러: ${e}`);
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
    <div class="space-y-8 p-6">
      {/* toPrinter */}
      <section>
        <h2 class="mb-4 text-xl font-bold">toPrinter</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          window.print()를 사용하여 브라우저 인쇄 대화상자를 표시합니다.
        </p>
        <Button theme="primary" variant="solid" onClick={handlePrint}>
          인쇄하기
        </Button>
      </section>

      {/* toPdf - 단일 페이지 (자동 분할) */}
      <section>
        <h2 class="mb-4 text-xl font-bold">toPdf - 단일 (자동 분할)</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print 컴포넌트 없이 콘텐츠를 PDF로 변환합니다. A4 높이 기준 자동 분할.
        </p>
        <Button theme="primary" variant="outline" onClick={handlePdfSingle}>
          PDF 다운로드 (단일)
        </Button>
      </section>

      {/* toPdf - 다중 페이지 */}
      <section>
        <h2 class="mb-4 text-xl font-bold">toPdf - 다중 페이지</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print.Page로 명시적으로 3페이지를 분할합니다.
        </p>
        <Button theme="primary" variant="outline" onClick={handlePdfMultiPage}>
          PDF 다운로드 (3페이지)
        </Button>
      </section>

      {/* toPdf - 가로 방향 */}
      <section>
        <h2 class="mb-4 text-xl font-bold">toPdf - 가로 방향</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          size: "A4 landscape" 옵션으로 가로 방향 PDF를 생성합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handlePdfLandscape}>
          PDF 다운로드 (가로)
        </Button>
      </section>

      {/* toPdf - 비동기 ready */}
      <section>
        <h2 class="mb-4 text-xl font-bold">toPdf - 비동기 ready</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Print ready 시그널을 사용하여 1초 후 데이터 로딩이 완료된 뒤 PDF를 생성합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handlePdfWithReady}>
          PDF 다운로드 (비동기)
        </Button>
      </section>

      {/* 상태 표시 */}
      <section>
        <h2 class="mb-4 text-xl font-bold">상태</h2>
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
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Print</h1>
      </Topbar>
      <div class="flex-1 overflow-auto">
        <PrintDemo />
      </div>
    </Topbar.Container>
  );
}
