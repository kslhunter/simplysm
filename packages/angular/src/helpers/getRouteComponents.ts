import {Type} from "@angular/core";
import {Routes} from "@angular/router";

export function getRouteComponents(routes: Routes): Type<any>[] {
  let result: Type<any>[] = [];
  for (const route of routes) {
    if (route.component) {
      result.push(route.component);
    }

    if (route.children) {
      result = result.concat(getRouteComponents(route.children));
    }
  }
  return result;
}