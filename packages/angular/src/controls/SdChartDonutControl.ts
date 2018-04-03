import {
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    ElementRef,
    forwardRef,
    Input,
    QueryList
} from "@angular/core";

@Component({
    selector: `sd-chart-donut`,
    template: `
        <svg [attr.viewBox]="'0 0 200 200'"
             xmlns="http://www.w3.org/2000/svg">
            <g>
                <circle r="80"
                        cy="100"
                        cx="100"
                        stroke-width="40"
                        fill="none"></circle>
                <circle *ngFor="let itemControl of itemControlList?.toArray()?.reverse()"
                        r="80"
                        cy="100"
                        cx="100"
                        stroke-width="40"
                        fill="none"
                        stroke-dasharray="502.6548245743669"
                        [attr.stroke-dashoffset]="getStrokeDashOffset(itemControl) + 'px'"
                        [attr.class]="'_theme-' + itemControl.theme"
                        [attr.data-value]="itemControl.value"
                        [attr.data-label]="itemControl.label"></circle>
            </g>
            <text x="100"
                  y="90"
                  text-anchor="middle"
                  alignment-baseline="middle"
                  font-size="24px"
                  fill="black"></text>
            <text x="100"
                  y="120"
                  text-anchor="middle"
                  alignment-baseline="middle"
                  font-size="24px"
                  fill="black"></text>
        </svg>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdChartDonutControl {
    @Input() maxValue = 1;

    @ContentChildren(forwardRef(() => SdChartDonutItemControl))
    itemControlList: QueryList<SdChartDonutItemControl> | undefined;

    constructor(private _elementRef: ElementRef,
                private _appRef: ApplicationRef) {
        const $this = $(this._elementRef.nativeElement);
        $this.on("mouseover", "circle[class]", event => {
            const $circle = $(event.target);
            const label = $circle.data("label");
            const percent = Math.round(Math.min((Number($circle.data("value")) / this.maxValue), 1) * 10000) / 100
                + "%";

            const $text = $this.find("text");
            $text.eq(0).text(label);
            $text.eq(1).text(percent);

            this._appRef.tick();
        });

        $this.on("mouseleave", () => {
            const $text = $this.find("text");
            $text.text("");
        });
    }

    getStrokeDashOffset(itemControl: SdChartDonutItemControl): number {
        const index = this.itemControlList!.toArray().indexOf(itemControl);

        const prevPixel = index > 0 ? 502.6548245743669 - this.getStrokeDashOffset(this.itemControlList!.toArray()[index - 1]) : 0;

        return (502.6548245743669 * (1 - Math.min((itemControl.value / this.maxValue), 1))) - prevPixel;
    }
}

@Component({
    selector: `sd-chart-donut-item`,
    template: ``,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdChartDonutItemControl {
    @Input() value = 0;
    @Input() theme = "primary";
    @Input() label = "";
}

@Component({
    selector: `circle`,
    template: ``,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CircleControl {
}