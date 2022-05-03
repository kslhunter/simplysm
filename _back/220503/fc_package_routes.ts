export const fc_package_routes = (): string => /* language=ts */ `

import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "home",
    loadChildren: async () => await import("./_modules/app/HomePageModule").then((m) => m.HomePageModule)
  },
  {
    path: "login",
    loadChildren: async () => await import("./_modules/app/LoginPageModule").then((m) => m.LoginPageModule)
  }
];
`.trim();
