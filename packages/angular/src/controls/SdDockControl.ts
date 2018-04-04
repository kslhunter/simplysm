import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    forwardRef,
    Inject,
    Input,
    NgZone
} from "@angular/core";
import {Exception} from "@simplism/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
    selector: "sd-dock-container",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDockContainerControl implements AfterViewInit {
    constructor(private _elementRef: ElementRef,
                private _zone: NgZone) {
    }


    ngAfterViewInit(): void {
        this._zone.runOutsideAngular(() => {
            SimgularHelpers.detectElementChange(this._elementRef.nativeElement, () => {
                if (
                    $(this._elementRef.nativeElement)
                        .children()
                        .toArray()
                        .some(item => !["sd-pane", "sd-dock"].includes(item.tagName.toLowerCase()))
                ) {
                    throw new Error(`"sd-dock-container"안에는, "sd-pane", "sd-dock"외의 엘리먼트를 사용할 수 없습니다.`);
                }

                this.resizing();
            }, {
                childList: false
            });
        });
    }

    resizing(): void {
        const dockElements = Array.from(this._elementRef.nativeElement.children)
            .map(item => item as HTMLElement)
            .filter(item => item.tagName.toLowerCase() === "sd-dock");

        let sumTopHeight = 0;
        let sumBottomHeight = 0;
        let sumLeftWidth = 0;
        let sumRightWidth = 0;
        for (const dockElement of dockElements) {
            const position = dockElement.getAttribute("_sd-position");
            if (position === "top") {
                dockElement.style.position = "absolute";
                dockElement.style.top = sumTopHeight + "px";
                dockElement.style.left = sumLeftWidth + "px";
                dockElement.style.right = sumRightWidth + "px";
                sumTopHeight += dockElement.offsetHeight;
            }
            else if (position === "bottom") {
                dockElement.style.position = "absolute";
                dockElement.style.bottom = sumBottomHeight + "px";
                dockElement.style.left = sumLeftWidth + "px";
                dockElement.style.right = sumRightWidth + "px";
                sumBottomHeight += dockElement.offsetHeight;
            }
            else if (position === "left") {
                dockElement.style.position = "absolute";
                dockElement.style.top = sumTopHeight + "px";
                dockElement.style.bottom = sumBottomHeight + "px";
                dockElement.style.left = sumLeftWidth + "px";
                sumLeftWidth += dockElement.offsetWidth;
            }
            else if (position === "right") {
                dockElement.style.position = "absolute";
                dockElement.style.top = sumTopHeight + "px";
                dockElement.style.bottom = sumBottomHeight + "px";
                dockElement.style.right = sumRightWidth + "px";
                sumRightWidth += dockElement.offsetWidth;
            }
        }

        this._elementRef.nativeElement.style["padding-top"] = sumTopHeight + "px";
        this._elementRef.nativeElement.style["padding-bottom"] = sumBottomHeight + "px";
        this._elementRef.nativeElement.style["padding-left"] = sumLeftWidth + "px";
        this._elementRef.nativeElement.style["padding-right"] = sumRightWidth + "px";
    }
}

@Component({
    selector: "sd-dock",
    template: `
        <hr *ngIf="resizable"
            (mousedown)="startResize($event)"/>
        <div>
            <ng-content></ng-content>
        </div>`,
    host: {
        "[class._resizable]": "resizable",
        "[attr._sd-position]": "position"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdDockControl implements AfterViewInit {
    private _position = "top";
    get position(): string {
        return this._position;
    }

    @Input()
    set position(value: string) {
        if (!["top", "bottom", "left", "right"].includes(value)) {
            throw new Exception(`'sd-dock.position'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._position = value;
    }

    @Input() resizable = false;

    constructor(private _elementRef: ElementRef,
                @Inject(forwardRef(() => SdDockContainerControl)) private _container: SdDockContainerControl,
                private _zone: NgZone) {
    }


    ngAfterViewInit(): void {
        if ($(this._elementRef.nativeElement).parent().get(0).tagName.toLocaleLowerCase() !== "sd-dock-container") {
            throw new Exception("'sd-dock'이 'sd-dock-container'의 자식이 아닙니다.'");
        }

        this._zone.runOutsideAngular(() => {
            SimgularHelpers.detectElementChange(this._elementRef.nativeElement, () => {
                this._container.resizing();
            }, {
                childList: false
            });
        });
    }

    startResize(event: MouseEvent): void {
        if (this.position === "bottom") {
            const startY = event.clientY;
            const startHeight = this._elementRef.nativeElement.clientHeight;

            const doDrag = (e: MouseEvent) => {
                this._elementRef.nativeElement.style.height =
                    (startHeight - e.clientY + startY) + "px";
                this._container.resizing();
            };

            const stopDrag = () => {
                document.documentElement.removeEventListener("mousemove", doDrag, false);
                document.documentElement.removeEventListener("mouseup", stopDrag, false);
                SimgularHelpers.rerunDetectElementChanges();
            };
            document.documentElement.addEventListener("mousemove", doDrag, false);
            document.documentElement.addEventListener("mouseup", stopDrag, false);
            SimgularHelpers.stopDetectElementChanges();
        }
        else if (this.position === "right") {
            const startX = event.clientX;
            const startWidth = this._elementRef.nativeElement.clientWidth;

            const doDrag = (e: MouseEvent) => {
                this._elementRef.nativeElement.style.width =
                    (startWidth - e.clientX + startX) + "px";
                this._container.resizing();
            };

            const stopDrag = () => {
                document.documentElement.removeEventListener("mousemove", doDrag, false);
                document.documentElement.removeEventListener("mouseup", stopDrag, false);
                SimgularHelpers.rerunDetectElementChanges();
            };
            document.documentElement.addEventListener("mousemove", doDrag, false);
            document.documentElement.addEventListener("mouseup", stopDrag, false);
            SimgularHelpers.stopDetectElementChanges();
        }
    }
}