import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  HostBinding,
  Input,
  QueryList
} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-dock",
  template: `
    <hr *ngIf="resizable" (mousedown)="_onResizerMousedown($event)"/>
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdDockControl}]
})
export class SdDockControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["top", "left", "bottom", "right"].includes(value),
    notnull: true
  })
  @HostBinding("attr.sd-position")
  public position: "top" | "left" | "bottom" | "right" = "top";

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  @HostBinding("style.height.px")
  public height = 0;

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  @HostBinding("style.width.px")
  public width = 0;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-resizable")
  public resizable?: boolean;

  @HostBinding("style.top.px")
  public top?: number;

  @HostBinding("style.right.px")
  public right?: number;

  @HostBinding("style.bottom.px")
  public bottom?: number;

  @HostBinding("style.left.px")
  public left?: number;

  public _onResizerMousedown(event: MouseEvent): void {
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = this.height;
    const startWidth = this.width;

    document.documentElement.on("mousemove.sd-dock", (evt: MouseEvent) => {
      if (this.position === "bottom") {
        this.height = startHeight - evt.clientY + startY;
      }
      else if (this.position === "right") {
        this.width = startWidth - evt.clientX + startX;
      }
      else if (this.position === "top") {
        this.height = startHeight + evt.clientY - startY;
      }
      else if (this.position === "left") {
        this.width = startWidth + evt.clientX - startX;
      }
    });

    document.documentElement.on("mouseup.sd-dock", () => {
      document.documentElement.off("mousemove.sd-dock");
      document.documentElement.off("mouseup.sd-dock");
    });
  }
}

@Component({
  selector: "sd-dock-container",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdDockContainerControl}]
})
export class SdDockContainerControl extends SdComponentBase implements AfterContentInit {
  @ContentChildren(SdDockControl, {descendants: true})
  public readonly dockControls?: QueryList<SdDockControl>;

  @HostBinding("style.padding")
  public padding = "0";

  public ngAfterContentInit(): void {
    this.redraw();
    this.dockControls!.changes.subscribe(() => {
      this.redraw();
    });
  }

  public redraw(): void {
    let top = 0;
    let left = 0;
    let bottom = 0;
    let right = 0;
    for (const dock of this.dockControls!.toArray()) {
      const position = dock.position.split(" ")[0];
      if (position === "top") {
        dock.top = top;
        dock.bottom = undefined;
        dock.left = left;
        dock.right = right;
        top += dock.height;
      }
      else if (position === "bottom") {
        dock.top = undefined;
        dock.bottom = bottom;
        dock.left = left;
        dock.right = right;
        bottom += dock.height;
      }
      else if (position === "left") {
        dock.top = top;
        dock.bottom = bottom;
        dock.left = left;
        dock.right = undefined;
        left += dock.width;
      }
      else if (position === "right") {
        dock.top = top;
        dock.bottom = bottom;
        dock.left = undefined;
        dock.right = right;
        right += dock.width;
      }

      this.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }
}