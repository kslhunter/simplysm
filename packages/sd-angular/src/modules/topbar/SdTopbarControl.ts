import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  forwardRef,
  Injector,
  QueryList,
  ViewEncapsulation
} from "@angular/core";
import {SdSidebarContainerControl} from "../sidebar/SdSidebarContainerControl";
import {SdTopbarMenuControl} from "./SdTopbarMenuControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <a (click)="toggleSidebar()" style="font-size: 16px;"
       *ngIf="!!sidebarContainerControl && !isSidebarContainerHidden">
      <sd-icon [icon]="'bars'" [fw]="true"></sd-icon>
    </a>
    <div *ngIf="!sidebarContainerControl || !!isSidebarContainerHidden"
         style="display: inline-block;"
         class="sd-padding-left-lg"></div>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/_mixins";
    @import "../../../scss/_variables-scss";
    
    sd-topbar {
      display: block;
      position: absolute;
      z-index: var(--z-index-topbar);
      top: 0;
      left: 0;
      width: 100%;
      height: var(--topbar-height);
      line-height: var(--topbar-height);
      background: var(--theme-primary-default);
      color: var(--text-reverse-color-default);
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      
      &::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, .1);
      }

      &::-webkit-scrollbar-corner {
        background-color: rgba(0, 0, 0, .1);
      }

      &::-webkit-scrollbar {
        width: var(--gap-sm);
        height: var(--gap-sm);
        background-color: rgba(0, 0, 0, 0);
      }

      &::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, .2);
      }

      > * {
        display: inline-block;
        line-height: var(--topbar-height);
        vertical-align: top;
      }

      > a {
        min-width: var(--topbar-height);
        text-align: center;
        margin-right: var(--gap-lg);
        color: var(--theme-grey-lighter);

        &:hover,
        &:focus {
          outline-color: transparent;
          background: rgba(0, 0, 0, 0.2);
          color: white;
        }

        &:active {
          background: rgba(0, 0, 0, .3);
          color: white;
        }
      }

      > h1, > h2, > h3, > h4, > h5, > h6 {
        padding-right: var(--gap-lg);
      }
      
      @media screen and (max-width: $screen-mobile-width) {
        @include elevation(4);
      }
    }
  `]
})
export class SdTopbarControl {
  @ContentChildren(forwardRef(() => SdTopbarMenuControl), {descendants: true})
  public topbarMenuControls?: QueryList<SdTopbarMenuControl>;

  public get sidebarContainerControl(): SdSidebarContainerControl | undefined {
    const control = this._injector.get<SdSidebarContainerControl | null>(SdSidebarContainerControl, null); //tslint:disable-line:no-null-keyword
    if (control === null) {
      return undefined;
    }
    else {
      return control;
    }
  }

  public get isSidebarContainerHidden(): boolean {
    return !!this.sidebarContainerControl && this.sidebarContainerControl.hidden;
  }

  public constructor(private readonly _injector: Injector) {
  }

  public toggleSidebar(): void {
    const sidebarControl = this.sidebarContainerControl;
    if (!!sidebarControl) {
      sidebarControl.toggle = !sidebarControl.toggle;
    }
  }
}
