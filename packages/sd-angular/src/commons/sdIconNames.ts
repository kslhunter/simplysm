import { fas } from "@fortawesome/free-solid-svg-icons";
import { sdIconNameFn } from "./sdIconNameFn";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";

export const sdIconNames = Object.values(fas)
  .concat(Object.values(fab))
  .concat(Object.values(far))
  .map(sdIconNameFn)
  .distinct();
