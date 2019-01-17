import {CommonModule} from "@angular/common";
import {ModuleWithProviders, NgModule, Provider} from "@angular/core";
import {Type} from "@simplysm/common";
import {SdStyleProvider} from "./providers/SdStyleProvider";
import {sdStyleDefaults} from "./styles/sdStyleDefaults";
import {SdStyleFunction} from "./commons/style/commons";

const controls: Type<any>[] = [];

const entryControls: Type<any>[] = [];

const attributes: Type<any>[] = [];

const pipes: Type<any>[] = [];

const providers: Provider[] = [
  SdStyleProvider
];

const styles: { [key: string]: SdStyleFunction } = {
  "sd-defaults": sdStyleDefaults
};

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
  entryComponents: [
    ...entryControls
  ]
})
export class SdAngularModule {
  public constructor(style: SdStyleProvider) {
    for (const styleKey of Object.keys(styles)) {
      style.addStyles(styleKey, styles[styleKey]);
    }
  }

  public static forRoot(): ModuleWithProviders {
    return {ngModule: SdAngularModule, providers};
  }
}
