import { ChangeDetectionStrategy, Component, HostListener, input, ViewEncapsulation } from "@angular/core";
import { injectElementRef } from "../../utils/injectElementRef";
import * as echarts from 'echarts';
import { $effect } from "../../utils/$hooks";

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
      }
    `,
  ],
})
export class SdEchartsControl {
  #elRef = injectElementRef();

  #chart!: echarts.EChartsType;

  option = input.required<echarts.EChartsOption>();
  height = input.required<string>();
  loading = input(false);

  constructor() {
    $effect([], () => {
      this.#chart = echarts.init(this.#elRef.nativeElement, null, { renderer: "svg", height: this.height() });
    });

    $effect(() => {
      this.#chart.setOption(this.option());
    });

    $effect(() => {
      if (this.loading()) {
        this.#chart.showLoading();
      }
      else {
        this.#chart.hideLoading();
      }
    })
  }

  @HostListener("sdResize")
  onResize() {
    this.#chart.resize();
  }
}


/*
{
    animation: true,
    series: [
      {
        type: "gauge",
        anchor: {
          show: false,
        },
        pointer: {
          show: false,
        },
        progress: {
          show: true,
          overlap: true,
          roundCap: true,
          width: 16,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          distance: -4,
          lineStyle: {
            color: "var(--theme-primary-light)", //"#9fa8da"
          },
        },
        data: [
          {
            name: "처리된 작업",
            value: 0,
            itemStyle: {
              color: "var(--theme-primary-light)", //"#9fa8da"
            },
            title: {
              show: false,
            },
            detail: {
              show: false,
            },
          },
          {
            name: "Completed Task",
            value: 0,
            itemStyle: {
              color: "var(--theme-primary-default)", // "#3f51b5"
            },
            title: {
              offsetCenter: ["0", "-15%"],
              color: "var(--theme-grey-default)", //"#9e9e9e",
              fontSize: 14,
            },
            detail: {
              offsetCenter: ["10%", "20%"],
              formatter: "{value}%",
              fontSize: 36,
            },
          },
        ],
      },
    ],
  };
*/