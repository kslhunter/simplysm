import { ChangeDetectionStrategy, Component, HostListener, input, ViewEncapsulation } from "@angular/core";
import { injectElementRef } from "../utils/injectElementRef";
import * as echarts from 'echarts';
import { $effect } from "../utils/$hooks";

/**
 * ECharts 컴포넌트
 * 
 * Apache ECharts 차트 라이브러리를 Angular에서 사용할 수 있게 해주는 래퍼 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-echarts [option]="chartOption" height="300px">
 * </sd-echarts>
 * 
 * <!-- 로딩 상태 표시 -->
 * <sd-echarts 
 *   [option]="chartOption" 
 *   height="300px"
 *   [loading]="isLoading">
 * </sd-echarts>
 * ```
 * 
 * @remarks
 * - ECharts 옵션을 직접 설정할 수 있습니다
 * - 차트의 높이를 지정할 수 있습니다
 * - 로딩 상태를 표시할 수 있습니다
 * - SVG 렌더러를 사용합니다
 * - 반응형 디자인을 지원합니다
 * - 옵션이 변경되면 자동으로 차트가 업데이트됩니다
 * - 윈도우 크기가 변경되면 자동으로 리사이즈됩니다
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