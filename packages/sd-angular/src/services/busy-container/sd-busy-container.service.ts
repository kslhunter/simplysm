import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdBusyContainerService {
  public type?: "bar" | "spinner";
  public noFade?: boolean;
}
