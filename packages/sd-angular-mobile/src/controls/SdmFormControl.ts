import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import { SdDomValidatorRootProvider, SdInputValidate, SdToastProvider } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  styles: [/* language=SCSS */ `
    :host {
      &[sd-layout="table"] > form {
        display: table;
        width: 100%;
      }
    }
  `]
})
export class SdmFormControl {
  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["cascade", "table"]
  })
  @HostBinding("attr.sd-layout")
  public layout: "cascade" | "table" = "cascade";

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

