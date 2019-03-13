import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../commons/SdNotifyPropertyChange";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content">
      <div class="_content-user">
        <div class="sd-padding-v-sm">
          <sd-icon style="font-size: 48px;" [icon]="'user-circle'" [fw]="true"></sd-icon>
        </div>
        <ng-content></ng-content>        
      </div>
      <div class="_btn" (click)="open = !open">
        내 계정 정보
        <sd-icon class="_angle-icon" [icon]="'chevron-down'" [fw]="true"></sd-icon>
      </div>
    </div>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-sidebar-user-menu"></ng-content>        
      </div>
    </div>`
})
export class SdSidebarUserControl implements AfterViewInit, ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @ViewChild("childContent")
  public childContentElRef?: ElementRef<HTMLDivElement>;

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
