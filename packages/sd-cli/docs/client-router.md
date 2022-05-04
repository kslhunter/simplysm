# 클라이언트 패키지에 Router 기능 추가

## @angular/router 의존성 추가

package.json

``` json
{
  ...,
  "dependencies": {
    "@angular/router": "^13.2.0",
    ...
  }
}
```

## RouterModule import

AppModule.ts

``` ts
...
import { AppPageModule } from "./_modules/AppPageModule";
import { routes } from "./_routes";
...

@NgModule({
  imports: [
    RouterModule.forRoot([
      // 경로 미지정시, 첫 화면으로 표시될 경로
      { path: "", redirectTo: "/login", pathMatch: "full" },
      ...routes
    ], { useHash: true }),
    ...
  ]
})
export class AppModule implements DoBootstrap {
  ...
}
```

## ROOT 페이지에 로딩바 추가

``` ts
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
  
  ...
}

```

## 추가 작업

* [클라이언트 패키지에 라우팅 페이지 생성](client-add-page.md)
