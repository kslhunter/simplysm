import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  Optional,
  Output
} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-form",
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdFormControl}]
})
export class SdFormControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["inline", "table"].includes(value)
  })
  @HostBinding("attr.sd-layout")
  public layout?: "inline" | "table";

  @Output()
  public readonly submit = new EventEmitter<any>();

  public onSubmit(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    this.submit.emit();
  }
}

@Component({
  selector: "sd-form-item",
  template: `
    <label *ngIf="layout === 'table' || label">{{ label }}</label>
    <div>
      <ng-content></ng-content>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdFormItemControl}]
})
export class SdFormItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public label?: string;

  public constructor(@Inject(SdFormControl)
                     @Optional()
                     private readonly _parentFormControl: SdFormControl) {
    super();
  }

  public get layout(): "inline" | "table" | undefined {
    return this._parentFormControl.layout;
  }
}
