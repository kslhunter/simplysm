import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdSmtpServiceProvider } from "./sd-smtp-service.provider";

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
  providers: [SdSmtpServiceProvider]
})
export class SdSmtpServiceModule {
}
