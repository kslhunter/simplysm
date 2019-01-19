import {CommonModule} from "@angular/common";
import {ModuleWithProviders, NgModule, Provider} from "@angular/core";
import {Type} from "@simplysm/common";
import {SdLinkControl} from "./controls/SdLinkControl";

const controls: Type<any>[] = [
  SdLinkControl
];

const entryControls: Type<any>[] = [];

const attributes: Type<any>[] = [];

const pipes: Type<any>[] = [];

const providers: Provider[] = [];

@NgModule({
  imports: [
    CommonModule
  ],
  exports: [
    ...controls,
    ...entryControls,
    ...attributes,
    ...pipes
  ],
  declarations: [
    ...controls,
    ...entryControls,
    ...attributes,
    ...pipes
  ],
  entryComponents: entryControls
})
export class SdAngularModule {
  public static forRoot(): ModuleWithProviders {
    return {ngModule: SdAngularModule, providers};
  }
}
