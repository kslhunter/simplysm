import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, Type} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {SdToastProvider} from "../providers/SdToastProvider";
import {SdLazyPageLoaderProvider} from "../providers/SdLazyPageLoaderProvider";
import {CommonModule} from "@angular/common";
import {SdBusyContainerControl} from "./SdBusyContainerControl";

@Component({
  selector: "sd-lazy-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, SdBusyContainerControl],
  template: `
    <sd-busy-container [busy]="busyCount > 0" noFade type="bar">
      <ng-container *ngIf="componentType">
        <ng-container *ngComponentOutlet="componentType; ngModuleFactory: moduleFactory">
        </ng-container>
      </ng-container>
    </sd-busy-container>`
})
export class SdLazyPageControl implements OnInit {
  public busyCount = 0;

  @Input()
  @SdInputValidate({type: String, notnull: true})
  public code!: string;

  public componentType?: Type<any>;
  public moduleFactory?: any;

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _lazyPage: SdLazyPageLoaderProvider) {
  }

  public async ngOnInit(): Promise<void> {
    this.busyCount++;

    await this._toast.try(async () => {
      const page = await this._lazyPage.loadAsync(["home"].concat(this.code).join("."));

      this.componentType = page.component;
      this.moduleFactory = page.moduleFactory;
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }
}
