import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { injectElementRef } from "../../core/utils/injections/injectElementRef";
import * as echarts from "echarts";
import { $effect } from "../../core/utils/bindings/$effect";

@Component({
  selector: "sd-echarts",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "(sdResize)": "onHostResize()",
  },
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
  private readonly _elRef = injectElementRef();

  private _chart!: echarts.EChartsType;

  option = input.required<echarts.EChartsOption>();
  loading = input(false);

  constructor() {
    $effect([], () => {
      this._chart = echarts.init(this._elRef.nativeElement, null, { renderer: "svg" });
    });

    $effect(() => {
      this._chart.setOption(this.option());
    });

    $effect(() => {
      if (this.loading()) {
        this._chart.showLoading();
      } else {
        this._chart.hideLoading();
      }
    });
  }

  onHostResize() {
    this._chart.resize();
  }
}
