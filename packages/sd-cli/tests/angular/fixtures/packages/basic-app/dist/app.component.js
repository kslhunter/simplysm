import { Component } from "@angular/core";
import * as i0 from "@angular/core";
export class AppComponent {
    title = "test-app";
    static ɵfac = function AppComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AppComponent)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AppComponent, selectors: [["app-root"]], decls: 2, vars: 1, template: function AppComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "h1");
            i0.ɵɵtext(1);
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate(ctx.title);
        } }, styles: ["[_nghost-%COMP%] {\n  display: block;\n}\n[_nghost-%COMP%]   h1[_ngcontent-%COMP%] {\n  color: red;\n}"] });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AppComponent, [{
        type: Component,
        args: [{ selector: "app-root", standalone: true, template: `<h1>{{ title }}</h1>`, styles: [":host {\n  display: block;\n}\n:host h1 {\n  color: red;\n}"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "app.component.ts", lineNumber: 15 }); })();
