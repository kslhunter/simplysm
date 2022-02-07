import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgModuleFactory,
  OnInit,
  Type
} from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { SdToastProvider } from "../toast";
import { SdLazyViewLoaderProvider } from "./internal/sd-lazy-view-loader.provider";

@Component({
  selector: "sd-lazy-page-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0" noFade type="bar">
      <ng-container *ngIf="componentType">
        <ng-container *ngComponentOutlet="componentType; ngModuleFactory: moduleFactory">
        </ng-container>
      </ng-container>
    </sd-busy-container>`,
  styles: [/* language=SCSS */ `
    :host {

    }
  `]
})
export class SdLazyViewControl implements OnInit {
  public busyCount = 0;

  @Input()
  @SdInputValidate({ type: String, notnull: true })
  public code!: string;

  public componentType?: Type<any>;
  public moduleFactory?: NgModuleFactory<any>;

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _lazyPage: SdLazyViewLoaderProvider) {
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
