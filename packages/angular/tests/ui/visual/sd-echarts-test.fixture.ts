import { Component, signal } from "@angular/core";
import type * as echarts from "echarts";
import { SdEchartsControl } from "../../../src/ui/visual/sd-echarts.control";

@Component({
  selector: "sd-echarts-default-test",
  template: `<sd-echarts [option]="option" style="width: 400px; height: 300px;" />`,
  standalone: true,
  imports: [SdEchartsControl],
})
export class SdEchartsDefaultTest {
  option: echarts.EChartsOption = {
    xAxis: { type: "category", data: ["A", "B", "C"] },
    yAxis: { type: "value" },
    series: [{ data: [1, 2, 3], type: "bar" }],
  };
}

@Component({
  selector: "sd-echarts-change-test",
  template: `<sd-echarts [option]="option()" [loading]="loading()" style="width: 400px; height: 300px;" />`,
  standalone: true,
  imports: [SdEchartsControl],
})
export class SdEchartsChangeTest {
  option = signal<echarts.EChartsOption>({
    xAxis: { type: "category", data: ["A", "B", "C"] },
    yAxis: { type: "value" },
    series: [{ data: [1, 2, 3], type: "bar" }],
  });
  loading = signal(false);
}
