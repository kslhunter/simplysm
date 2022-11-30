import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from "@angular/router";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0" noFade type="bar">
      <router-outlet></router-outlet>
    </sd-busy-container>
  `
})
export class AppPage implements OnInit {
  public busyCount = 0;

  public constructor(private readonly _router: Router,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public ngOnInit(): void {
    // 페이지 이동시 로딩 표시
    this._router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.busyCount++;
      }
      else if (
        event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ) {
        this.busyCount--;
      }
      this._cdr.markForCheck();
    });
  }
}
