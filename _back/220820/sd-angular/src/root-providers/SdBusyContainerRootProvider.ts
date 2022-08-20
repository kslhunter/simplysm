import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdBusyContainerRootProvider {
  public type?: "bar" | "spinner";
  public noFade?: boolean;
}
