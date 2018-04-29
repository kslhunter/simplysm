import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    Output
} from "@angular/core";
import {Exception, NotImplementedException} from "../../../sd-core/src";

@Component({
    selector: "sd-drawing",
    template: `
        <svg [attr.viewBox]="'0 0 200 200'" xmlns="http://www.w3.org/2000/svg">
            <text #text
                  x="100"
                  y="105"
                  text-anchor="middle"
                  alignment-baseline="middle"
                  font-size="100px"
                  fill="black"
                  opacity="0.1">
                {{ watermark }}
            </text>
        </svg>

        <canvas></canvas>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDrawingControl implements AfterContentInit {
    private _isDrawing = false;

    @Input()
    public set value(value: Buffer | undefined) {
        if (value === this._value) {
            return;
        }
        this._value = value;

        const $this = $(this._elementRef.nativeElement);
        const canvasElement = $this.find("canvas").get(0) as HTMLCanvasElement;
        const context = canvasElement.getContext("2d")!;
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
        if (!value) {
            return;
        }

        const blob = new Blob([value], {type: "image/png"});
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = (e) => {
            context.drawImage(e.target as HTMLImageElement, 0, 0);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    private _value: Buffer | undefined;

    @Output() public readonly valueChange = new EventEmitter<Buffer | undefined>();

    @Input()
    public set watermark(value: string | undefined) {
        if (!(typeof value === "string" || typeof value === "undefined")) {
            throw new Exception(`'sd-drawing.watermark'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._watermark = value;
    }

    public get watermark(): string | undefined {
        return this._watermark;
    }

    private _watermark: string | undefined;

    @Input()
    public set readonly(value: boolean) {
        if (!(typeof value === "boolean")) {
            throw new Exception(`'sd-drawing.watermark'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        this._readonly = value;
    }

    private _readonly = false;

    public constructor(private _elementRef: ElementRef,
                       private _zone: NgZone) {
    }

    public ngAfterContentInit(): void {
        const $this = $(this._elementRef.nativeElement);
        const canvasElement = $this.find("canvas").get(0) as HTMLCanvasElement;
        canvasElement.width = $this.outerWidth()!;
        canvasElement.height = $this.outerWidth()! * (9 / 16);
        $this.css("height", $this.outerWidth()! * (9 / 16));
        const context = canvasElement.getContext("2d")!;
        context.imageSmoothingEnabled = true;

        this._zone.runOutsideAngular(() => {
            $(canvasElement).on("mousedown mousemove mouseup touchstart touchmove touchend", (evt) => {
                this.onDrawing(evt as any);
            });
        });
    }

    private _offsetTop = 0;
    private _offsetLeft = 0;
    private _scrollTop = 0;
    private _scrollLeft = 0;

    public onDrawing(e: MouseEvent | TouchEvent): any {
        if (this._readonly) {
            return;
        }

        if (["mousedown", "touchstart"].includes(e.type)) {
            e.preventDefault();

            const thisElement = this._elementRef.nativeElement as HTMLElement;
            const canvasElement = thisElement.getElementsByTagName("canvas").item(0);
            const context = canvasElement.getContext("2d")!;

            let elem = canvasElement as HTMLElement;
            this._offsetTop = 0;
            this._offsetLeft = 0;
            while (elem) {
                this._offsetTop += elem.offsetTop;
                this._offsetLeft += elem.offsetLeft;
                elem = elem.offsetParent as HTMLElement;
            }

            this._scrollTop = 0;
            this._scrollLeft = 0;
            let scrollElem = canvasElement as HTMLElement;
            while (scrollElem) {
                this._scrollTop += scrollElem.scrollTop;
                this._scrollLeft += scrollElem.scrollLeft;
                scrollElem = scrollElem.parentElement as HTMLElement;
            }

            const x = (e instanceof MouseEvent ? e.clientX : e.targetTouches[0].pageX) - this._offsetLeft + this._scrollLeft;
            const y = (e instanceof MouseEvent ? e.clientY : e.targetTouches[0].pageY) - this._offsetTop + this._scrollTop;

            context.beginPath();
            context.moveTo(x, y);
            context.strokeStyle = "#000";
            context.lineJoin = "round";
            context.lineCap = "round";
            context.lineWidth = 8;

            this._isDrawing = true;
        }
        else if (["mousemove", "touchmove"].includes(e.type)) {
            if (this._isDrawing) {
                e.preventDefault();

                const x = (e instanceof MouseEvent ? e.clientX : e.targetTouches[0].pageX) - this._offsetLeft + this._scrollLeft;
                const y = (e instanceof MouseEvent ? e.clientY : e.targetTouches[0].pageY) - this._offsetTop + this._scrollTop;

                const thisElement = this._elementRef.nativeElement as HTMLElement;
                const canvasElement = thisElement.getElementsByTagName("canvas").item(0);
                const context = canvasElement.getContext("2d")!;
                context.lineTo(x, y);
                context.stroke();
            }
        }
        else if (["mouseup", "touchend"].includes(e.type)) {
            if (!this._isDrawing) {
                return;
            }

            this._isDrawing = false;

            const thisElement = this._elementRef.nativeElement as HTMLElement;
            const canvasElement = thisElement.getElementsByTagName("canvas").item(0);
            canvasElement.toBlob((blob) => {
                const fileReader = new FileReader();
                fileReader.onload = (evt: Event) => {
                    const arrayBuffer = (evt.target as any).result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const buffer = new Buffer(uint8Array.byteLength);
                    for (let i = 0; i < buffer.length; i++) {
                        buffer[i] = uint8Array[i];
                    }
                    this._zone.run(() => {
                        this._value = buffer;
                        this.valueChange.emit(buffer);
                    });
                };
                fileReader.readAsArrayBuffer(blob!);
            }, "image/png");

            e.preventDefault();
        }
        else {
            throw new NotImplementedException();
        }
    }
}