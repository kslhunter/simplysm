import {ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, ViewEncapsulation} from "@angular/core";
import Quill from "quill";

@Component({
  selector: "sd-quill-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
  styles: [/* language=SCSS */ `
  `]
})
export class SdHtmlEditorControl implements OnInit {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit() {
    new Quill(this.#elRef.nativeElement, {
      theme: "snow"
    });
  }
}
