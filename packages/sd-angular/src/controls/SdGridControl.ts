import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {Exception} from "../../../sd-core/src";

@Component({
    selector: "sd-grid",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdGridControl {
}

@Component({
    selector: "sd-grid-item",
    template: `
        <ng-content></ng-content>`,
    host: {
        "[style.width]": "width"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdGridItemControl {
    @Input()
    public set colspan(value: number) {
        if (!(typeof value === "number" && value > 0 && value <= 12)) {
            throw new Exception(`'sd-grid-item.colspan'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._colspan = value;
    }

    public get colspan(): number {
        return this._colspan;
    }

    private _colspan = 12;

    public get width(): string {
        return `${(100 / 12) * this._colspan}%`;
    }
}