import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
  ViewEncapsulation
} from "@angular/core";
import Quill from "quill";
import {SdNgHelper} from "../utils/SdNgHelper";
import {coercionBoolean} from "../utils/commons";
import QuillResizeImage from 'quill-resize-image';

Quill.register('modules/resize', QuillResizeImage);

@Component({
  selector: "sd-quill-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div></div>`,
  styles: [/* language=SCSS */ `

  `]
})
export class SdQuillEditorControl implements OnInit, DoCheck {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input({transform: coercionBoolean}) disabled = false;

  #quill!: Quill;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(run => {
      run({
        value: [this.value]
      }, () => {
        if (this.value == null) {
          this.#quill.root.innerHTML = "";
        }
        else if (this.value != this.#quill.root.innerHTML) {
          this.#quill.root.innerHTML = this.value;
        }
      });

      run({
        disabled: [this.disabled]
      }, () => {
        this.#quill.enable(!this.disabled);
        const toolbar = this.#quill.getModule("toolbar");
        console.log(toolbar);
      });
    });
  }

  ngOnInit() {
    this.#quill = new Quill(this.#elRef.nativeElement.firstElementChild as HTMLElement, {
      theme: "snow",
      modules: {
        toolbar: true,
        resize: {}
      }
    });

    this.#quill.root.addEventListener("input", () => {
      const newValue = this.#quill.root.innerHTML;
      if (this.valueChange.observed) {
        this.valueChange.emit(newValue);
      }
      else {
        this.value = newValue;
      }
    });

    this.#quill.on("text-change", () => {
      const newValue = this.#quill.root.innerHTML;
      if (this.valueChange.observed) {
        this.valueChange.emit(newValue);
      }
      else {
        this.value = newValue;
      }
    });
  }
}
