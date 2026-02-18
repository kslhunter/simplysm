import { Barcode, Topbar } from "@simplysm/solid";

export default function BarcodePage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Barcode</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* QR Code */}
          <section>
            <h2 class="mb-4 text-xl font-bold">QR Code</h2>
            <Barcode type="qrcode" value="https://example.com" />
          </section>

          {/* Code 128 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Code 128</h2>
            <Barcode type="code128" value="SIMPLYSM-2026" />
          </section>

          {/* EAN-13 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">EAN-13</h2>
            <Barcode type="ean13" value="5901234123457" />
          </section>

          {/* Data Matrix */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Data Matrix</h2>
            <Barcode type="datamatrix" value="Hello DataMatrix" />
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
