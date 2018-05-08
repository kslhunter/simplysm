import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-busy-container",
  template: `
    <div #content>
      <ng-content></ng-content>
    </div>
    <div #busy tabindex="1" *ngIf="busy">
      <div>
        <div></div>
        <div></div>
      </div>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdBusyContainerControl}]
})
export class SdBusyContainerControl extends SdComponentBase implements OnChanges {
  @Input()
  @SdTypeValidate(Boolean)
  public busy?: boolean;

  @ViewChild("content")
  public contentElRef!: ElementRef<HTMLDivElement>;

  @ViewChild("busy")
  public busyElRef?: ElementRef<HTMLDivElement>;

  public prevFocusedEl?: HTMLElement;

  public ngOnChanges(changes: SimpleChanges): void {
    const contentEl = this.contentElRef.nativeElement;
    const activeEl = document.activeElement as HTMLElement;

    if (this.busy) {
      contentEl.on("focus.sd-busy-container", event => event.preventDefault(), true);
      if (contentEl.has(activeEl)) {
        this.prevFocusedEl = activeEl;

        if (this.prevFocusedEl) {
          this.busyElRef!.nativeElement.focus();
        }
      }
      else {
        this.prevFocusedEl = undefined;
      }
    }
    else {
      contentEl.off("focus.sd-busy-container");
      if (this.prevFocusedEl) {
        this.prevFocusedEl.focus();
      }
    }
  }
}