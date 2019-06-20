import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdFileDialogProvider} from "./SdFileDialogProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdFileDialogProvider
  ]
})
export class SdFileDialogModule {
}
