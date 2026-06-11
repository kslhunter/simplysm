import { Component } from "@angular/core";
import type { Provider, EnvironmentProviders } from "@angular/core";
import { provideRouter, RouterOutlet } from "@angular/router";
import { provideClientHydration } from "@angular/platform-browser";
import { provideSdAngular } from "@simplysm/angular";

@Component({
  selector: "app-home",
  template: `<h1>SSG 홈페이지</h1>`,
})
export class HomePage {}

@Component({
  selector: "app-about",
  template: `<h1>회사 소개</h1>`,
})
export class AboutPage {}

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppRoot {}

export const appProviders: (Provider | EnvironmentProviders)[] = [
  provideRouter([
    { path: "", component: HomePage },
    { path: "about", component: AboutPage },
  ]),
  provideClientHydration(),
  provideSdAngular({ clientName: "ssg-fixture" }),
];
