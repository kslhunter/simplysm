import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdListControl} from "./SdListControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content">
      <label (click)="onLabelClick()"
             [attr.tabindex]="(header || !clickable) ? undefined : '0'">
        <ng-content></ng-content>
        <sd-icon class="_angle-icon" [icon]="'chevron-right'" [fw]="true" *ngIf="hasChildren"></sd-icon>
      </label>
      <ng-content select="sd-list-item-button"></ng-content>
    </div>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-list"></ng-content>
      </div>
    </div>`
})
export class SdListItemControl implements ISdNotifyPropertyChange, AfterViewInit {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-header")
  public header?: boolean;

  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-clickable")
  public clickable = true;

  @ContentChildren(SdListControl)
  public listControls?: QueryList<SdListControl>;

  @ViewChild("childContent", {static: true})
  public childContentElRef?: ElementRef<HTMLDivElement>;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return !!this.listControls && this.listControls.length > 0;
  }

  public onLabelClick(): void {
    if (this.clickable && this.hasChildren && !this.header) {
      this.open = !this.open;
    }
  }

  public ngAfterViewInit(): void {
    const childContentEl = this.childContentElRef!.nativeElement;

    Object.assign(
      childContentEl.style,
      {
        marginTop: (-childContentEl.offsetHeight) + "px",
        transition: "margin-top .1s ease-in"
      }
    );
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "open") {
      if (!this.childContentElRef) return;
      const childContentEl = this.childContentElRef.nativeElement;

      if (newValue) {
        Object.assign(
          childContentEl.style,
          {
            marginTop: "0",
            transition: "margin-top .1s ease-out"
          }
        );
      }
      else {
        Object.assign(
          childContentEl.style,
          {
            marginTop: (-childContentEl.offsetHeight) + "px",
            transition: "margin-top .1s ease-in"
          }
        );
      }
    }
  }
}
