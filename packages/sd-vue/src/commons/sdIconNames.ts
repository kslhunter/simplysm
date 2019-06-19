import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fab} from "@fortawesome/free-brands-svg-icons";

export const sdIconNames = Object.values({...fas, ...far, ...fab})
  .map(item => item.iconName as string)
  .distinct();
