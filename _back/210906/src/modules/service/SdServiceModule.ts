import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";
import { SdSmtpServiceProvider } from "./SdSmtpServiceProvider";
import { SdSharedDataProvider } from "./SdSharedDataProvider";
import { SdSharedDataSelectControl } from "./SdSharedDataSelectControl";
import { SdModalModule } from "../modal/SdModalModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdSelectControlModule } from "../select/SdSelectControlModule";
import { SdTextfieldControlModule } from "../textfield/SdTextfieldControlModule";
import { SdOrmServiceProvider } from "./SdOrmServiceProvider";
import { SdCryptoServiceProvider } from "./SdCryptoServiceProvider";
import { SdToastModule } from "../toast/SdToastModule";

@NgModule({
  imports: [
    CommonModule,
    SdToastModule,
    SdModalModule,
    SdAnchorControlModule,
    SdDockContainerControlModule,
    SdPaneControlModule,
    SdSelectControlModule,
    SdTextfieldControlModule
  ],
  declarations: [
    SdSharedDataSelectControl
  ],
  exports: [
    SdSharedDataSelectControl
  ],
  providers: [
    SdServiceFactoryProvider,
    SdSharedDataProvider,
    SdSmtpServiceProvider,
    SdOrmServiceProvider,
    SdCryptoServiceProvider
  ]
})
export class SdServiceModule {

}
