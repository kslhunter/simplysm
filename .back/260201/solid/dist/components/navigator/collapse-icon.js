import { splitProps } from "solid-js";
import { collapseIcon } from "./collapse-icon.css";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { combineStyle } from "@solid-primitives/props";
const CollapseIcon = (props) => {
  const [local, rest] = splitProps(props, [
    ...collapseIcon.variants(),
    "icon",
    "openRotate",
    "style",
    "class",
  ]);
  const rotate = () => (local.open ? (local.openRotate ?? 90) : 0);
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      ...rest,
      class: [collapseIcon(objPick(local, collapseIcon.variants())), local.class]
        .filterExists()
        .join(" "),
      style: combineStyle(local.style, { transform: `rotate(${rotate()}deg)` }),
    },
    local.icon({}),
  );
};
export { CollapseIcon };
//# sourceMappingURL=collapse-icon.js.map
