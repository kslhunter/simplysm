import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import * as echarts from "echarts";

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
export class SdEcharts {
  private readonly _chart = signal<echarts.ECharts | undefined>(undefined);

  option = input.required<echarts.EChartsOption>();
  notMerge = input(false);
  loading = input(false);

  constructor() {
    const elRef = inject(ElementRef);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const chart = echarts.init(elRef.nativeElement, null, { renderer: "svg" });
      this._chart.set(chart);
      destroyRef.onDestroy(() => chart.dispose());
    });

    effect(() => {
      const chart = this._chart();
      if (chart == null) return;
      chart.setOption(this.option(), { notMerge: this.notMerge() });
    });

    effect(() => {
      const chart = this._chart();
      if (chart == null) return;
      if (this.loading()) {
        chart.showLoading();
      } else {
        chart.hideLoading();
      }
    });
  }

  onHostResize() {
    this._chart()?.resize();
  }
}
