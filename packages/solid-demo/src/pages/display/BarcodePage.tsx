import { Barcode } from "@simplysm/solid";

export default function BarcodePage() {
  return (
    <div class="space-y-8 p-6">
      {/* QR Code */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">QR Code</h2>
        <Barcode type="qrcode" value="https://example.com" />
      </section>

      {/* Code 128 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Code 128</h2>
        <Barcode type="code128" value="SIMPLYSM-2026" />
      </section>

      {/* EAN-13 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">EAN-13</h2>
        <Barcode type="ean13" value="5901234123457" />
      </section>

      {/* Data Matrix */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Data Matrix</h2>
        <Barcode type="datamatrix" value="Hello DataMatrix" />
      </section>
    </div>
  );
}
