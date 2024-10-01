import { Injectable } from "@angular/core";
import { $reactive } from "../utils/$reactive";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  type$ = $reactive<"spinner" | "bar" | "cube">("spinner");
  noFade$ = $reactive(false);
}
