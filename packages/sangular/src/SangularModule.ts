import {NgModule, Type} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {SdButtonControl} from "./controls/sd-button/SdButtonControl";
import {SdFormControl} from "./controls/sd-form/SdFormControl";
import {SdFormItemControl} from "./controls/sd-form/SdFormItemControl";
import {SdTextfieldControl} from "./controls/sd-textfield/SdTextfieldControl";
import {SdPaddingDirective} from "./directives/SdPaddingDirective";

const modules: Type<any>[] = [
    BrowserModule
];

const controls: Type<any>[] = [
    SdButtonControl,
    SdTextfieldControl,
    SdFormControl, SdFormItemControl
];

const providers: Type<any>[] = [];

const directives: Type<any>[] = [
    SdPaddingDirective
];

const pipes: Type<any>[] = [];

@NgModule({
    imports: ([] as any[])
        .concat(modules),
    declarations: ([] as any[])
        .concat(controls)
        .concat(directives)
        .concat(pipes),
    exports: ([] as any[])
        .concat(modules)
        .concat(controls)
        .concat(directives)
        .concat(pipes),
    providers: ([] as any[])
        .concat(providers)
})
export class SangularModule {
}
