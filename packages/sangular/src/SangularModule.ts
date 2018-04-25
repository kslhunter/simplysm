import {NgModule, Type} from "@angular/core";
import {SdButtonControl} from "./controls/SdButtonControl";

const modules: Type<any>[] = [];

const controls: Type<any>[] = [
    SdButtonControl
];

const providers: Type<any>[] = [];

const directives: Type<any>[] = [];

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