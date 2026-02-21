import { createSignal } from "solid-js";
import { Button, Echarts } from "@simplysm/solid";
import type { EChartsOption } from "echarts";

export default function EchartsPage() {
  const [busy, setBusy] = createSignal(false);

  const barOption: EChartsOption = {
    title: { text: "Bar Chart" },
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [120, 200, 150, 80, 70] }],
  };

  const lineOption: EChartsOption = {
    title: { text: "Line Chart" },
    xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [{ type: "line", data: [820, 932, 901, 934, 1290, 1330] }],
  };

  return (
    <div class="space-y-8 p-6">
      {/* Bar Chart */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Bar Chart</h2>
        <div class="h-80">
          <Echarts option={barOption} busy={busy()} />
        </div>
      </section>

      {/* Line Chart */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Line Chart</h2>
        <div class="h-80">
          <Echarts option={lineOption} busy={busy()} />
        </div>
      </section>

      {/* Loading 토글 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Busy</h2>
        <Button onClick={() => setBusy((v) => !v)}>{busy() ? "로딩 해제" : "로딩 표시"}</Button>
      </section>
    </div>
  );
}
