import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdDomValidatorRootProvider } from "../root-providers/SdDomValidatorRootProvider";
import { SdToastProvider } from "../providers/SdToastProvider";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      &[sd-layout="table"] > form {
        display: table;
        width: 100%;
      }
      
      &[sd-layout="inline"] > form {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gap-sm);
      }

      &[sd-layout="none"] > form {
        display: contents;
      }
    }
  `]
})
export class SdFormControl {
  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["cascade", "inline", "table", "none"]
  })
  @HostBinding("attr.sd-layout")
  public layout: "cascade" | "inline" | "table" | "none" = "cascade";

  @Input("label.width")
  @SdInputValidate(String)
  public labelWidth?: string;

  @Input("label.align")
  @SdInputValidate({
    type: String,
    includes: ["left", "right", "center"]
  })
  public labelAlign: "left" | "right" | "center" | undefined;

  @Output()
  public readonly submit = new EventEmitter<Event | undefined>();

  public constructor(private readonly _domValidator: SdDomValidatorRootProvider,
                     private readonly _elRef: ElementRef,
                     private readonly _toast: SdToastProvider) {
  }

  public onSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      this._domValidator.validate(this._elRef.nativeElement);
    }
    catch (err) {
      this._toast.danger(err.message);
      return;
    }
    this.submit.emit(event);
  }
}
