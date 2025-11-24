import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { injectElementRef } from "../../core/utils/injections/injectElementRef";
import * as echarts from "echarts";
import { $effect } from "../../core/utils/bindings/$effect";

@Component({
  selector: "sd-echarts",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      sd-echarts {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class SdEchartsControl {
  #elRef = injectElementRef();

  #chart!: echarts.EChartsType;

  option = input.required<echarts.EChartsOption>();
  loading = input(false);

  constructor() {
    $effect([], () => {
      this.#chart = echarts.init(this.#elRef.nativeElement, null, { renderer: "svg" });
    });

    $effect(() => {
      this.#chart.setOption(this.option());
    });

    $effect(() => {
      if (this.loading()) {
        this.#chart.showLoading();
      } else {
        this.#chart.hideLoading();
      }
    });
  }

  @HostListener("sdResize")
  onResize() {
    this.#chart.resize();
  }
}
