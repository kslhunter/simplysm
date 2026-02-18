import { createSignal } from "solid-js";
import { Button, Echarts, Topbar } from "@simplysm/solid";
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
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Echarts</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Bar Chart */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Bar Chart</h2>
            <div class="h-80">
              <Echarts option={barOption} busy={busy()} />
            </div>
          </section>

          {/* Line Chart */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Line Chart</h2>
            <div class="h-80">
              <Echarts option={lineOption} busy={busy()} />
            </div>
          </section>

          {/* Loading 토글 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Busy</h2>
            <Button onClick={() => setBusy((v) => !v)}>{busy() ? "로딩 해제" : "로딩 표시"}</Button>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
