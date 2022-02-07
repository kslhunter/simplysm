import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdNoteControl } from "./sd-note.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdNoteControl],
  exports: [SdNoteControl],
  providers: []
})
export class SdNoteModule {
}
