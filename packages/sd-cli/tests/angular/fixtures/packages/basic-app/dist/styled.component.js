import { Component } from "@angular/core";
import * as i0 from "@angular/core";
export class StyledComponent {
    static ɵfac = function StyledComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || StyledComponent)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: StyledComponent, selectors: [["app-styled"]], decls: 2, vars: 0, template: function StyledComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "p");
            i0.ɵɵtext(1, "styled");
            i0.ɵɵdomElementEnd();
        } }, styles: ["[_nghost-%COMP%] {\n  color: blue;\n}"] });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(StyledComponent, [{
        type: Component,
        args: [{ selector: "app-styled", standalone: true, template: `<p>styled</p>`, styles: [":host {\n  color: blue;\n}"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(StyledComponent, { className: "StyledComponent", filePath: "styled.component.ts", lineNumber: 14 }); })();
