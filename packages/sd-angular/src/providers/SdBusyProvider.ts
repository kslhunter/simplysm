import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdBusyProvider {
  public type?: "bar" | "spinner";
  public noFade?: boolean;
}
