import {Directive, ElementRef, Input} from "@angular/core";
import {ArgumentsException} from "../../../core/src";

@Directive({
    selector: "[sdPadding]",
})
export class SdPaddingDirective {
    public constructor(private _elementRef: ElementRef<HTMLElement>) {
    }

    @Input()
    public set sdPadding(value: string | undefined) {
        if (value != undefined && typeof value !== "string") {
            throw new ArgumentsException({value});
        }

        const thisEl = this._elementRef.nativeElement;
        for (const className of Array.from(thisEl.classList).filter((item) => item.startsWith("_sd-padding"))) {
            thisEl.classList.remove(className);
        }

        if (value === undefined) {
            thisEl.removeAttribute("sd-padding-top");
            thisEl.removeAttribute("sd-padding-right");
            thisEl.removeAttribute("sd-padding-bottom");
            thisEl.removeAttribute("sd-padding-left");
        }
        else {
            const args = value.split(" ");
            if (args.length === 4) {
                thisEl.setAttribute("sd-padding-top", args[0]);
                thisEl.setAttribute("sd-padding-right", args[1]);
                thisEl.setAttribute("sd-padding-bottom", args[2]);
                thisEl.setAttribute("sd-padding-left", args[3]);
            }
            else if (args.length === 3) {
                thisEl.setAttribute("sd-padding-top", args[0]);
                thisEl.setAttribute("sd-padding-right", args[1]);
                thisEl.setAttribute("sd-padding-bottom", args[2]);
                thisEl.setAttribute("sd-padding-left", args[1]);
            }
            else if (args.length === 2) {
                thisEl.setAttribute("sd-padding-top", args[0]);
                thisEl.setAttribute("sd-padding-right", args[1]);
                thisEl.setAttribute("sd-padding-bottom", args[0]);
                thisEl.setAttribute("sd-padding-left", args[1]);
            }
            else if (args.length === 1) {
                thisEl.setAttribute("sd-padding-top", args[0]);
                thisEl.setAttribute("sd-padding-right", args[0]);
                thisEl.setAttribute("sd-padding-bottom", args[0]);
                thisEl.setAttribute("sd-padding-left", args[0]);
            }
            else {
                throw new ArgumentsException({value});
            }
        }
    }
}