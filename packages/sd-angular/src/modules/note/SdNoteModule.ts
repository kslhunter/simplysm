import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdNoteControl} from "./SdNoteControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdNoteControl
  ],
  declarations: [
    SdNoteControl
  ]
})
export class SdNoteModule {
}
