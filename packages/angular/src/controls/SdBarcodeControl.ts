import {ChangeDetectionStrategy, Component, ElementRef, Input} from "@angular/core";

require("jsbarcode");

@Component({
    selector: "sd-barcode",
    template: `
        <canvas></canvas>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdBarcodeControl {
    @Input() type = "code128";
    @Input() width = 1;
    @Input() height = 58;

    @Input()
    set value(value: string) {
        if (value) {
            const $canvas = $(this._elementRef.nativeElement).find("canvas");
            $canvas["JsBarcode"](
                value,
                {
                    format: this.type,
                    width: this.width,
                    height: this.height,
                    fontOptions: "bold",
                    fontSize: this.width * 12
                }
            );
        }
    }

    constructor(private _elementRef: ElementRef) {
    }
}