import {ChangeDetectionStrategy, Component, ContentChildren, HostListener, Input, QueryList} from "@angular/core";
import {SdThemeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-chart-donut-item",
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdChartDonutItemControl}]
})
export class SdChartDonutItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public value = 0;

  @Input()
  @SdTypeValidate("SdThemeString")
  public theme?: SdThemeString;

  @Input()
  @SdTypeValidate(String)
  public label?: string;
}

@Component({
  selector: "sd-chart-donut",
  template: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <g>
        <circle r="80"
                cy="100"
                cx="100"
                stroke-width="40"
                fill="none"></circle>
        <circle *ngFor="let itemControl of itemControlList?.toArray()?.reverse(); trackBy: getTrackByFn()"
                r="80"
                cy="100"
                cx="100"
                stroke-width="40"
                fill="none"
                stroke-dasharray="502.6548245743669"
                [attr.stroke-dashoffset]="getStrokeDashOffset(itemControl) + 'px'"
                [attr.sd-theme]="itemControl.theme"
                (mouseover)="onCircleMouseOver(itemControl)"></circle>
      </g>
      <text x="100"
            y="90"
            text-anchor="middle"
            alignment-baseline="middle"
            font-size="24px"
            fill="black">
        {{ currentLabel }}
      </text>
      <text x="100"
            y="120"
            text-anchor="middle"
            alignment-baseline="middle"
            font-size="24px"
            fill="black">
        {{ currentPercent }}
      </text>
    </svg>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdChartDonutControl}]
})
export class SdChartDonutControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public maxValue = 1;

  public currentLabel?: string;

  public currentPercent?: string;

  @ContentChildren(SdChartDonutItemControl)
  public itemControlList?: QueryList<SdChartDonutItemControl>;

  public getStrokeDashOffset(itemControl: SdChartDonutItemControl): number {
    const index = this.itemControlList!.toArray().indexOf(itemControl);

    const prevPixel = index > 0 ? 502.6548245743669 - this.getStrokeDashOffset(this.itemControlList!.toArray()[index - 1]) : 0;

    return ((1 - Math.min((itemControl.value / this.maxValue), 1)) * 502.6548245743669) - prevPixel;
  }

  public onCircleMouseOver(itemControl: SdChartDonutItemControl): void {
    this.currentLabel = itemControl.label;
    this.currentPercent = `${Math.round(Math.min((Number(itemControl.value) / this.maxValue), 1) * 10000) / 100}%`;
  }

  @HostListener("mouseleave")
  public onMouseLeave(): void {
    this.currentLabel = undefined;
    this.currentPercent = undefined;
  }
}