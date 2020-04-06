import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdNoteControl} from "../../controls/SdNoteControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdNoteControl
  ],
  exports: [
    SdNoteControl
  ],
  entryComponents: [],
  providers: []
})
export class SdNoteControlModule {
}