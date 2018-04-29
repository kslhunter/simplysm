import {Component, ElementRef, forwardRef, Inject, Input, NgZone, OnChanges, SimpleChanges} from "@angular/core";
import {SimgularHelpers} from "..";

@Component({
    selector: "sd-dock-container",
    template: `
        <ng-content></ng-content>`
})
export class SdDockContainerControl {
    public constructor(private _elementRef: ElementRef) {
    }

    public redraw(): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const dockEls = thisEl.findAll("> sd-dock");

        let top = 0;
        let left = 0;
        let bottom = 0;
        let right = 0;
        for (const dockEl of dockEls) {
            const position = dockEl.getAttribute("sd-position");
            if (position === "top") {
                Object.assign(dockEl.style, {
                    top: `${top}px`,
                    bottom: null,
                    left: `${left}px`,
                    right: `${right}px`
                });
                top += dockEl.offsetHeight;
            }
            else if (position === "bottom") {
                Object.assign(dockEl.style, {
                    top: null,
                    bottom: `${bottom}px`,
                    left: `${left}px`,
                    right: `${right}px`
                });
                bottom += dockEl.offsetHeight;
            }
            else if (position === "left") {
                Object.assign(dockEl.style, {
                    top: `${top}px`,
                    bottom: `${bottom}px`,
                    left: `${left}px`,
                    right: null
                });
                left += dockEl.offsetWidth;
            }
            else if (position === "right") {
                Object.assign(dockEl.style, {
                    top: `${top}px`,
                    bottom: `${bottom}px`,
                    left: null,
                    right: `${right}px`
                });
                right += dockEl.offsetWidth;
            }
        }

        Object.assign(thisEl.style, {
            paddingTop: `${top}px`,
            paddingLeft: `${left}px`,
            paddingRight: `${right}px`,
            paddingBottom: `${bottom}px`
        });
    }
}

@Component({
    selector: "sd-dock",
    template: `
        <hr (mousedown)="onResizerMousedown($event)"/>
        <ng-content></ng-content>`,
    host: {
        "[attr.sd-position]": "position",
        "[attr.sd-resizable]": "resizable"
    }
})
export class SdDockControl implements OnChanges {
    @Input() public position: "top" | "bottom" | "left" | "right" = "top";
    @Input() public resizable?: boolean;

    public ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            position: {
                type: String,
                validator: (value) => ["top", "bottom", "left", "right"].includes(value),
                required: true
            },
            resizable: Boolean
        });
    }

    public constructor(private _elementRef: ElementRef,
                       private _zone: NgZone,
                       @Inject(forwardRef(() => SdDockContainerControl))
                       private _container: SdDockContainerControl) {
        this._zone.runOutsideAngular(() => {
            SimgularHelpers.detectElementChange(this._elementRef.nativeElement, () => {
                this._container.redraw();
            }, {childList: false});
        });
    }

    public onResizerMousedown(event: MouseEvent): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const startX = event.clientX;
        const startY = event.clientY;
        const startHeight = thisEl.clientHeight;
        const startWidth = thisEl.clientWidth;

        const doDrag = (e: MouseEvent) => {
            if (this.position === "bottom") {
                thisEl.style.height = `${startHeight - e.clientY + startY}px`;
            }
            else if (this.position === "right") {
                thisEl.style.width = `${startWidth - e.clientX + startX}px`;
            }
            else if (this.position === "top") {
                thisEl.style.height = `${startHeight + e.clientY - startY}px`;
            }
            else if (this.position === "left") {
                thisEl.style.width = `${startWidth + e.clientX - startX}px`;
            }
        };

        const stopDrag = () => {
            document.documentElement.removeEventListener("mousemove", doDrag, false);
            document.documentElement.removeEventListener("mouseup", stopDrag, false);
        };
        document.documentElement.addEventListener("mousemove", doDrag, false);
        document.documentElement.addEventListener("mouseup", stopDrag, false);
    }
}