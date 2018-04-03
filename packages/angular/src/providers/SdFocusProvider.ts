import {Injectable} from "@angular/core";

@Injectable()
export class SdFocusProvider {
    next($parent: JQuery = $("body")): boolean {
        const $focusableList = $(this.getFocusableElementList($parent.get(0)));
        const currIndex = $focusableList.index(document.activeElement);
        if (currIndex < $focusableList.length - 1) {
            $focusableList[currIndex + 1].focus();
            return true;
        }
        return false;
    }

    prev($parent: JQuery = $("body")): boolean {
        const $focusableList = $(this.getFocusableElementList($parent.get(0)));
        const currIndex = $focusableList.index(document.activeElement);
        if (currIndex > 0) {
            $focusableList[currIndex - 1].focus();
            return true;
        }
        return false;
    }

    getFocusableElementList(element: Element): Element[] {
        const focusableElementList = [
            "a[href]",
            "button:not([disabled])",
            "area[href]",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "iframe",
            "object",
            "embed",
            "*[tabindex]",
            "*[contenteditable]"
        ];
        return $(element).find(focusableElementList.join()).toArray();
    }
}