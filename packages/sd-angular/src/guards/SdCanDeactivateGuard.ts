import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from "@angular/router";

@Injectable({ providedIn: null })
export class SdCanDeactivateGuard implements CanDeactivate<any> {
  public fn?: () => boolean;

  public canDeactivate(component: any,
                       route: ActivatedRouteSnapshot,
                       state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.fn ? this.fn() : true;
  }
}
