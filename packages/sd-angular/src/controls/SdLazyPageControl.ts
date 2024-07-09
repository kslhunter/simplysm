import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
  Type,
  ViewEncapsulation
} from "@angular/core";
import {SdToastProvider} from "../providers/SdToastProvider";
import {SdLazyPageLoaderProvider} from "../providers/SdLazyPageLoaderProvider";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {NgComponentOutlet} from "@angular/common";

@Component({
  selector: "sd-lazy-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    NgComponentOutlet
  ],
  template: `
    <sd-busy-container [busy]="busyCount > 0" noFade type="bar">
      @if (componentType) {
        <ng-container *ngComponentOutlet="componentType; ngModuleFactory: moduleFactory"/>
      }
    </sd-busy-container>`
})
export class SdLazyPageControl implements OnInit {
  @Input({required: true}) code!: string;

  busyCount = 0;

  componentType?: Type<any>;
  moduleFactory?: any;

  #sdToast = inject(SdToastProvider);
  #cdr = inject(ChangeDetectorRef);
  #sdLazyPageLoader = inject(SdLazyPageLoaderProvider);

  async ngOnInit() {
    this.busyCount++;

    await this.#sdToast.try(async () => {
      const page = await this.#sdLazyPageLoader.loadAsync(this.code);

      this.componentType = page.component;
      this.moduleFactory = page.moduleFactory;
    });
    this.busyCount--;
    this.#cdr.markForCheck();
  }
}
