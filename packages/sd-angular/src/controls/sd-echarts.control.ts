import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { injectElementRef } from "../utils/injections/inject-element-ref";
import * as echarts from "echarts";
import { $effect } from "../utils/bindings/$effect";

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
  private _elRef = injectElementRef();

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

  @HostListener("sdResize")
  onResize() {
    this._chart.resize();
  }
}
