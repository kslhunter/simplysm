import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdBusyRootProvider {
  public type?: "bar" | "spinner";
  public noFade?: boolean;
}
