import {CommonModule} from "@angular/common";
import {ModuleWithProviders, NgModule, Provider} from "@angular/core";
import {Type} from "@simplysm/common";
import {SdLinkControl} from "./controls/SdLinkControl";
import {SdCardControl} from "./controls/SdCardControl";
import {SdFormControl, SdFormItemControl} from "./controls/SdFormControl";
import {SdTextfieldControl} from "./controls/SdTextfieldControl";
import {SdButtonControl} from "./controls/SdButtonControl";
import {SdSidebarContainerControl, SdSidebarControl, SdSidebarItemControl} from "./controls/SdSidebarControl";
import {SdPaneControl} from "./controls/SdPaneControl";
import {SdIconControl} from "./controls/SdIconControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

const controls: Type<any>[] = [
  SdLinkControl,
  SdCardControl,
  SdFormControl,
  SdFormItemControl,
  SdTextfieldControl,
  SdButtonControl,
  SdSidebarContainerControl,
  SdSidebarControl,
  SdSidebarItemControl,
  SdPaneControl,
  SdIconControl
];

const entryControls: Type<any>[] = [];

const attributes: Type<any>[] = [];

const pipes: Type<any>[] = [];

const providers: Provider[] = [];

@NgModule({
  imports: [
    CommonModule,
    FontAwesomeModule
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
