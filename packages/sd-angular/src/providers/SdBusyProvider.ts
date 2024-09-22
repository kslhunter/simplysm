import { Injectable } from "@angular/core";
import { $signal } from "../utils/$hooks";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  type = $signal<"spinner" | "bar" | "cube">("spinner");
  noFade = $signal(false);
}
