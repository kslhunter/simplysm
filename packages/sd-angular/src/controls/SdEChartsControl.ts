import { ChangeDetectionStrategy, Component, HostListener, input, ViewEncapsulation } from "@angular/core";
import { injectElementRef } from "../utils/injectElementRef";
import * as echarts from 'echarts';
import { $effect } from "../utils/$hooks";

/**
 * ECharts 컨트롤 컴포넌트
 * 
 * Apache ECharts 라이브러리를 Angular에서 사용할 수 있게 해주는 래퍼 컴포넌트입니다.
 * 
 * 이 컴포넌트는 다음과 같은 기능을 제공합니다:
 * - ECharts 차트 렌더링
 * - 차트 옵션 설정
 * - 차트 높이 조절
 * - 로딩 상태 표시
 * 
 * @example
 * ```html
 * <sd-echarts 
 *   [option]="chartOptions" 
 *   height="400px"
 *   [loading]="isLoading">
 * </sd-echarts>
 * ```
 */
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
export class SdEChartsControl {
  /** 컴포넌트의 ElementRef */
  #elRef = injectElementRef();
  /** ECharts 인스턴스 */
  #chart!: echarts.EChartsType;

  /** 차트 옵션 설정 */
  option = input.required<echarts.EChartsOption>();
  /** 차트의 높이 */
  height = input.required<string>();
  /** 로딩 상태 표시 여부 */
  loading = input(false);

  constructor() {
    // 차트 초기화
    $effect([], () => {
      this.#chart = echarts.init(this.#elRef.nativeElement, null, { renderer: "svg", height: this.height() });
    });

    // 차트 옵션 업데이트
    $effect(() => {
      this.#chart.setOption(this.option());
    });

    // 로딩 상태 처리
    $effect(() => {
      if (this.loading()) {
        this.#chart.showLoading();
      }
      else {
        this.#chart.hideLoading();
      }
    })
  }

  /**
   * 컴포넌트 크기 변경 시 차트 크기 조정
   */
  @HostListener("sdResize")
  onResize() {
    this.#chart.resize();
  }
}

/*
게이지 차트 옵션 예시:
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