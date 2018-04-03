import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input} from "@angular/core";
import {Exception} from "@simplism/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
    selector: "sd-button-group",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButtonGroupControl implements AfterViewInit {
    @Input()
    set size(value: string) {
        if (!["xxs", "xs", "sm", "default", "lg", "xl", "xxl"].includes(value)) {
            throw new Exception(`'sd-button-group.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._size = value;
    }

    get size(): string {
        return this._size;
    }

    private _size = "default";


    constructor(private _elementRef: ElementRef) {
    }

    ngAfterViewInit(): void {
        SimgularHelpers.detectElementChange(this._elementRef.nativeElement, () => {
            const thisElement: HTMLElement = this._elementRef.nativeElement;
            const childrenButtons = Array.from(thisElement.children)
                .map(item => item as HTMLElement)
                .filter((item: HTMLElement) => item.tagName.toLowerCase() === "sd-button");

            for (const btn of childrenButtons) {
                btn.style.width = (100 / childrenButtons.length) + "%";
            }
        });
    }
}